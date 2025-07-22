import path from "node:path";
import * as aws from "@pulumi/aws";
import * as command from "@pulumi/command";
import * as pulumi from "@pulumi/pulumi";
import * as mime from "mime-types";
import { registerAutoTags } from "pulumi-aws-tags";

// Automatically inject tags to created AWS resources.
registerAutoTags({
  "user:Project": pulumi.getProject(),
  "user:Stack": pulumi.getStack(),
});

// Create an S3 bucket.
const bucket = new aws.s3.Bucket("geoman-h3-demo-bucket", {
  bucket: "geoman-h3-demo.linhart.tech",
  forceDestroy: true,
});

const bucketPublicAccessBlock = new aws.s3.BucketPublicAccessBlock(
  "geoman-h3-demo-bucket-public-access-block",
  {
    bucket: bucket.id,
    blockPublicAcls: false,
    blockPublicPolicy: false,
    ignorePublicAcls: false,
    restrictPublicBuckets: false,
  }
);

new aws.s3.BucketPolicy(
  "geoman-h3-demo-bucket-policy",
  {
    bucket: bucket.id,
    policy: pulumi.jsonStringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: "*",
          Action: "s3:GetObject",
          Resource: pulumi.interpolate`${bucket.arn}/*`,
        },
      ],
    }),
  },
  { dependsOn: [bucketPublicAccessBlock] }
);

const bucketWebsite = new aws.s3.BucketWebsiteConfiguration(
  "geoman-h3-demo-bucket-website",
  {
    bucket: bucket.id,
    indexDocument: { suffix: "index.html" },
  }
);

// Create a DNS alias record for the bucket's website endpoint.
const zone = aws.route53.getZoneOutput({ name: "linhart.tech" });

const bucketDnsAlias = new aws.route53.Record(
  "geoman-h3-demo-bucket-dns-alias",
  {
    name: "geoman-h3-demo.linhart.tech",
    zoneId: zone.zoneId,
    type: "A",
    aliases: [
      {
        name: bucketWebsite.websiteDomain,
        zoneId: bucket.hostedZoneId,
        evaluateTargetHealth: false,
      },
    ],
  }
);

// Build the application.
const buildCommand = new command.local.Command("geoman-h3-demo-build-command", {
  create: "npm install && npm run build",
  dir: "..",
  triggers: [Math.random()],
  assetPaths: ["dist/**"],
});

// Create bucket objects for the built assets.
buildCommand.assets.apply(
  (assets) =>
    assets &&
    Object.values(assets).map((asset) => {
      const fileAsset = asset as pulumi.asset.FileAsset;
      pulumi.output(fileAsset.path).apply((filePath) => {
        const relPath = path.relative("../dist", filePath);
        const mimeType = mime.lookup(filePath);
        new aws.s3.BucketObject(`geoman-h3-demo-bucket-object-${relPath}`, {
          key: relPath,
          bucket: bucket.id,
          source: asset,
          cacheControl: relPath === "index.html" ? "max-age=0" : undefined,
          contentType: mimeType || undefined,
        });
      });
    })
);

// Export stack outputs.
exports.url = pulumi.interpolate`http://${bucketDnsAlias.fqdn}`;
