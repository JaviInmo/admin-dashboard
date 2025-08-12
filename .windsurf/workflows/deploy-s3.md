---
description: Deploy the Vite React app to AWS S3 (static hosting)
---

Prereqs
- AWS CLI v2 installed and configured (aws configure)
- An AWS account with permissions for S3 (and optionally CloudFront)
- Choose one package manager (npm or pnpm)

1) Install dependencies (if not installed yet)
- npm: npm i
- pnpm: pnpm i
- Make sure axios is installed: npm i axios or pnpm add axios

2) Build the app
- npm run build
- or pnpm build

3) Create an S3 bucket (replace MY_BUCKET and REGION)
- aws s3api create-bucket --bucket MY_BUCKET --region REGION --create-bucket-configuration LocationConstraint=REGION

4) (For S3 Website) Allow public reads (quick start; CloudFront recommended for production)
- aws s3api put-public-access-block --bucket MY_BUCKET --public-access-block-configuration BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false
- Create a file bucket-policy.json with the following content and replace MY_BUCKET:

{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::MY_BUCKET/*"
    }
  ]
}

- Apply policy:
- aws s3api put-bucket-policy --bucket MY_BUCKET --policy file://bucket-policy.json

5) Configure SPA website hosting (serve index.html for 404s)
- Create website.json with:

{
  "IndexDocument": { "Suffix": "index.html" },
  "ErrorDocument": { "Key": "index.html" }
}

- Apply website config:
- aws s3api put-bucket-website --bucket MY_BUCKET --website-configuration file://website.json

6) Upload build artifacts with proper caching
- Long cache for static assets (exclude index.html):
- aws s3 sync dist/ s3://MY_BUCKET --delete --exclude index.html --cache-control "public, max-age=31536000, immutable"
- Upload index.html with no-cache:
- aws s3 cp dist/index.html s3://MY_BUCKET/index.html --cache-control "no-cache, no-store, must-revalidate"

7) Get the website URL
- Website endpoint format:
  - http://MY_BUCKET.s3-website-REGION.amazonaws.com
  - or http://MY_BUCKET.s3-website.REGION.amazonaws.com (region-specific)

8) Backend CORS
- Your API Gateway must allow the S3/CloudFront domain in Access-Control-Allow-Origin (currently it allows http://localhost:5173 in dev). Update CORS to include your deployed domain.

Optional: CloudFront (recommended for prod)
- Create a CloudFront distribution with the S3 bucket as origin (use OAC for private bucket)
- Default root object: index.html
- Custom error responses: map 403 and 404 to /index.html with response code 200 (SPA routing)
- Set caching behavior (short TTL for HTML, long for assets)
- After each deploy, invalidate: aws cloudfront create-invalidation --distribution-id DIST_ID --paths "/index.html" "/assets/*"
