import { CfnOutput, Duration, RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib';
import {
  AllowedMethods,
  CachePolicy,
  Distribution,
  HttpVersion,
  PriceClass,
  ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { BlockPublicAccess, Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import type { Construct } from 'constructs';

import { tagPlatform } from './tags.js';

export interface WebStackProps extends StackProps {
  /** The built game, as a directory on disk. `screener/dist-sanctuary` after a vite build. */
  readonly sourceDirectory: string;
}

/**
 * Hosting for the game itself: a private bucket behind CloudFront.
 *
 * ══ WHY NOT S3 WEBSITE HOSTING ════════════════════════════════════════════════════════════════════
 *
 * The simpler option is a public bucket with website hosting turned on, and it is the wrong choice here twice
 * over. Organisation guardrails routinely deny removing an account's public-access block — this sandbox has
 * already produced two SCP denials tonight and there is no reason to bet on a third. And a public bucket serves
 * plain HTTP, which means a game asking a child for answers over an unencrypted connection.
 *
 * CloudFront with Origin Access Control keeps the bucket entirely private, terminates TLS, and gives a URL that
 * works without a domain — which matters when the thing needed is a link to send someone tonight.
 *
 * ══ THE SPA REWRITE, WHICH IS NOT OPTIONAL ════════════════════════════════════════════════════════
 *
 * `?demo=1` is a query parameter rather than a path, so this app does not strictly need deep-link routing. The
 * 404-to-index rewrite is here anyway because the cost of omitting it is a blank page for anyone who types a
 * trailing path, and a demo audience typing a URL from a slide is exactly the audience that would.
 *
 * ══ WHAT THIS DELIBERATELY DOES NOT DO ═══════════════════════════════════════════════════════════
 *
 * No custom domain and no certificate. Both need DNS this account does not obviously control, and a
 * `cloudfront.net` URL is a working link. Nothing here caches the API: CloudFront fronts the static bundle only,
 * and the game calls API Gateway directly, so a stale question can never be served from an edge cache.
 */
export class WebStack extends Stack {
  readonly distribution: Distribution;

  constructor(scope: Construct, id: string, props: WebStackProps) {
    super(scope, id, props);
    tagPlatform(this, {
      environment: this.node.tryGetContext('environment') as string | undefined,
      owner: this.node.tryGetContext('owner') as string | undefined,
    });

    const bucket = new Bucket(this, 'GameBucket', {
      // Private, and CloudFront reaches it through OAC rather than through a public policy.
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      /**
       * Destroyed with the stack, contents and all.
       *
       * The bundle is a build artefact reproducible from the repository in two seconds. Retaining it would leave
       * an orphaned bucket every time this stack is torn down, and an orphaned bucket in a shared sandbox is
       * somebody else's cleanup task.
       */
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    this.distribution = new Distribution(this, 'GameDistribution', {
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessControl(bucket),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
        /**
         * `CACHING_OPTIMIZED` on hashed asset filenames, which vite produces for everything but `index.html`
         * and `demo-bank.json`. Those two are handled by the short-TTL behaviours below, so a rebuild is visible
         * without an invalidation.
         */
        cachePolicy: CachePolicy.CACHING_OPTIMIZED,
      },
      additionalBehaviors: {
        /**
         * The entry point and the demo bank are the two files whose NAMES do not change between builds, so
         * caching them the same way as a hashed asset would serve yesterday's game after a deploy. Five minutes
         * is short enough that a mistake is recoverable by waiting and long enough to be worth having.
         */
        '/index.html': {
          origin: S3BucketOrigin.withOriginAccessControl(bucket),
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: new CachePolicy(this, 'ShortLived', {
            defaultTtl: Duration.minutes(5),
            minTtl: Duration.seconds(0),
            maxTtl: Duration.minutes(15),
          }),
        },
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        // See the SPA note in the class comment: a typed path should reach the game, not a CloudFront error.
        { httpStatus: 403, responseHttpStatus: 200, responsePagePath: '/index.html', ttl: Duration.minutes(5) },
        { httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/index.html', ttl: Duration.minutes(5) },
      ],
      httpVersion: HttpVersion.HTTP2_AND_3,
      // North America and Europe. The cheapest class that covers everyone who will see this, and this is a
      // sandbox rather than a product.
      priceClass: PriceClass.PRICE_CLASS_100,
      comment: 'GT question platform: the Bramblebrook game bundle.',
    });

    new BucketDeployment(this, 'GameFiles', {
      sources: [Source.asset(props.sourceDirectory)],
      destinationBucket: bucket,
      distribution: this.distribution,
      /**
       * Invalidate everything on deploy.
       *
       * Precise invalidation paths are the optimisation and this is a sandbox: paying for a full invalidation is
       * cheaper than the ten minutes spent working out why a stale `index.html` is still being served.
       */
      distributionPaths: ['/*'],
      prune: true,
    });

    new CfnOutput(this, 'GameUrl', {
      value: `https://${this.distribution.distributionDomainName}`,
      description: 'The deployed game. Add this origin to the API stack with -c origins=',
    });
    new CfnOutput(this, 'GameBucketName', {
      value: bucket.bucketName,
      description: 'Where the bundle lives',
    });
  }
}
