/**
 * Module 8: Data, Analytics & AI. Rio's shop now produces more data than anyone reads.
 * Clicks become a stream, the stream becomes a data lake and a warehouse, a model starts
 * recommending products, and the same tools are turned on the fraudsters.
 */

import { block, board, users, wire } from '../build';
import type { LevelStory } from '../story';

const ec2 = (id: string, gridX: number, gridZ = 0, name?: string) => block(id, 'ec2', gridX, gridZ, { name });
const kinesis = (id: string, gridX: number, gridZ = 0, name = 'Click Stream') => block(id, 'kinesis', gridX, gridZ, { name });
const model = (id: string, gridX: number, gridZ = 0, name = 'Recommender') => block(id, 'sagemaker', gridX, gridZ, { name });

const level71: LevelStory = {
  text: {
    title: 'Every Click Counts',
    tagline: 'Capture a torrent of events without slowing the shop down.',
    concepts: ['Amazon Kinesis Data Streams', 'Event streaming', 'Producers and consumers'],
    briefing:
      'Marketing wants every click as it happens, thousands a second. Writing them to the orders database would slow checkout, so send them from the web server into a Kinesis data stream instead.',
    docTips: [
      'A Kinesis data stream keeps records for 24 hours by default, extendable to 365 days. On-demand mode scales for you; in provisioned mode each shard takes up to 1 MB or 1,000 records a second.',
    ],
    conceptCard: {
      title: 'Data streams',
      summary:
        'A stream is an ordered, durable log of events. Producers add to it quickly and move on; any number of consumers read it at their own pace, in order.',
      analogy: 'A conveyor belt in a sorting office: parcels go on at one end, and each team picks off what it needs.',
      keyTakeaway: 'Record events in a stream, not in the database your customers are waiting on.',
    },
    iacSnippet: `resource "aws_kinesis_stream" "clicks" {
  name             = "clicks"
  retention_period = 24

  stream_mode_details {
    stream_mode = "ON_DEMAND"
  }
}`,
  },
  stages: [
    {
      title: 'Every click',
      brief: 'Marketing wants every click, the moment it happens.',
      goal: 'Send click events from the web server into a Kinesis stream.',
    },
  ],
  cutscene: {
    stage: board(
      [users(), ec2('web', 0, 0, 'Web Server'), block('db', 'rds', 5, -1, { name: 'Orders DB' }), kinesis('stream', 6, 1)],
      [wire('users', 'web'), wire('web', 'stream')],
    ),
    start: ['users', 'web'],
    beats: [
      { t: 'wire', ids: ['users--web'] },
      { t: 'caption', text: 'Marketing wants to know what shoppers click, the moment they click it.' },
      { t: 'traffic', expect: 'served' },
      { t: 'stat', label: 'Clicks / s', value: 5000, tone: 'warn' },
      { t: 'speech', who: 'oncall', text: 'Easy. I’ll insert every click into the orders database.' },
      { t: 'spawn', ids: ['db'] },
      { t: 'camera', shot: 'close', on: 'db' },
      { t: 'callout', on: 'db', title: 'Orders DB', body: '+5,000 writes a second', tone: 'bad' },
      { t: 'speech', who: 'cto', text: 'And slow down checkout to record mouse clicks? Clicks are a stream of events. Put them on one.' },
      { t: 'clear' },
      { t: 'spawn', ids: ['stream'], hold: 900 },
      { t: 'camera', shot: 'orbit', on: 'stream' },
      { t: 'caption', text: 'Send click events from the web server into a Kinesis data stream.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'clicks written into the orders database',
    change: { remove: ['stream'], add: 'db:rds@5,0', wire: 'web-db' },
    fails: 's1-1',
  },
};

const level72: LevelStory = {
  text: {
    title: 'Land the Stream',
    tagline: 'Catch every event before it falls off the end of the stream.',
    concepts: ['Data lakes', 'Amazon S3', 'Amazon Data Firehose'],
    briefing:
      'Click events vanish from the stream after 24 hours, so last week’s are already gone. Deliver the stream into an S3 bucket so every event is kept, cheaply, for as long as you need it.',
    docTips: [
      'Amazon Data Firehose (formerly Kinesis Data Firehose) reads a stream, batches the records and writes them to S3 as files, with no code to run. Partition them by date so later queries scan less.',
    ],
    conceptCard: {
      title: 'Data lakes',
      summary:
        'A data lake stores raw data in open formats, usually in S3. It keeps everything cheaply and durably, so you can decide later which questions to ask of it.',
      analogy: 'An archive room where every receipt goes into a dated box, ready for whoever needs it next.',
      keyTakeaway: 'Streams are for moving data. S3 is for keeping it.',
    },
    iacSnippet: `resource "aws_kinesis_firehose_delivery_stream" "clicks_to_s3" {
  name        = "clicks-to-s3"
  destination = "extended_s3"

  kinesis_source_configuration {
    kinesis_stream_arn = aws_kinesis_stream.clicks.arn
    role_arn           = aws_iam_role.firehose.arn
  }

  extended_s3_configuration {
    role_arn   = aws_iam_role.firehose.arn
    bucket_arn = aws_s3_bucket.lake.arn
    prefix     = "clicks/"
  }
}`,
  },
  stages: [
    {
      title: 'Data lake',
      brief: 'Click events vanish from the stream after 24 hours unless you land them somewhere.',
      goal: 'Deliver the stream into an S3 bucket.',
    },
  ],
  cutscene: {
    stage: board(
      [users(), ec2('web', 0, 0, 'Web Server'), kinesis('stream', 6, 0), block('lake', 's3', 6, 2, { name: 'Data Lake' })],
      [wire('users', 'web'), wire('web', 'stream'), wire('stream', 'lake')],
    ),
    start: ['users', 'web', 'stream'],
    beats: [
      { t: 'wire', ids: ['users--web', 'web--stream'] },
      { t: 'caption', text: 'Clicks are flowing into the stream. A week later, marketing has a question.' },
      { t: 'traffic', expect: 'served' },
      { t: 'speech', who: 'founder', text: 'What did people click during last Tuesday’s sale? Just pull it from the stream.' },
      { t: 'camera', shot: 'close', on: 'stream' },
      { t: 'callout', on: 'stream', title: 'Retention: 24 hours', body: 'Last Tuesday is gone', tone: 'bad' },
      { t: 'speech', who: 'oncall', text: 'A stream is a conveyor belt, not a warehouse. Records fall off the end.' },
      { t: 'spawn', ids: ['lake'], hold: 900 },
      { t: 'camera', shot: 'low', on: 'lake' },
      { t: 'speech', who: 'cto', text: 'So land everything in S3. It’s cheap, it’s durable, and it keeps whatever we give it.' },
      { t: 'clear' },
      { t: 'caption', text: 'Deliver the stream into an S3 bucket: the start of a data lake.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'the web server writing each click straight to S3',
    change: { unwire: 'stream-lake', wire: 'web-lake' },
    fails: 's1-1',
  },
};

const level73: LevelStory = {
  text: {
    title: 'The Board Pack',
    tagline: 'Move heavy reporting off the database customers use.',
    concepts: ['Amazon Redshift', 'OLTP vs OLAP', 'Business intelligence'],
    briefing:
      'The shop and the executives’ Reporting App share one orders database, and every Monday the board-pack queries slow checkout to a crawl. Give the Reporting App a Redshift data warehouse, and take it off the orders database completely.',
    docTips: [
      'Redshift Serverless runs a warehouse with no clusters to size: you pay for the compute your queries use. BI tools connect to it over JDBC or ODBC with ordinary SQL.',
    ],
    conceptCard: {
      title: 'OLTP and OLAP',
      summary:
        'Transaction databases (OLTP) are tuned for many small reads and writes. Analytics warehouses (OLAP) are tuned for a few huge queries over many rows. Running one workload on the other system hurts both.',
      analogy: 'Doing the annual stocktake during the Saturday rush: the counting is slow and the queue gets longer.',
      keyTakeaway: 'Keep reporting off the database that takes the orders.',
    },
    iacSnippet: `resource "aws_redshiftserverless_namespace" "bi" {
  namespace_name = "bi"
  db_name        = "reporting"
}

resource "aws_redshiftserverless_workgroup" "bi" {
  namespace_name = aws_redshiftserverless_namespace.bi.namespace_name
  workgroup_name = "bi"
  base_capacity  = 8
  subnet_ids     = aws_subnet.private[*].id
}`,
  },
  stages: [
    {
      title: 'BI warehouse',
      brief: 'Every Monday the board-pack queries scan years of orders, and checkout slows to a crawl.',
      goal: 'Point the Reporting App at Redshift, and disconnect it from the orders database.',
      hint: 'Add Redshift in the private subnet, wire the Reporting App to it, and delete the Reporting App’s wire to the Orders DB.',
    },
  ],
  cutscene: {
    stage: board(
      [
        users(),
        block('shop', 'ecs', 2, -2, { name: 'Shop' }),
        ec2('web', 0, 1, 'Reporting App'),
        block('db', 'rds', 5, -1, { name: 'Orders DB' }),
        block('wh', 'redshift', 5, 1, { name: 'Warehouse' }),
      ],
      [wire('users', 'shop'), wire('shop', 'db'), wire('users', 'web'), wire('web', 'db'), wire('web', 'wh')],
    ),
    start: ['users', 'shop', 'db'],
    beats: [
      { t: 'wire', ids: ['users--shop', 'shop--db'] },
      { t: 'traffic', expect: 'served' },
      { t: 'caption', text: 'Monday, 9 a.m. Rio’s executives open the sales dashboard.' },
      { t: 'spawn', ids: ['web'] },
      { t: 'wire', ids: ['users--web', 'web--db'] },
      { t: 'camera', shot: 'close', on: 'db' },
      { t: 'callout', on: 'db', title: 'Orders DB', body: 'Scanning 2 billion rows', tone: 'bad' },
      { t: 'stat', label: 'Checkout latency', value: 2400, unit: 'ms', tone: 'bad' },
      { t: 'speech', who: 'finance', text: 'Every time I refresh my dashboard, customers can’t pay?' },
      { t: 'speech', who: 'cto', text: 'Orders and reports want different databases. Give the reporting app its own Redshift.' },
      { t: 'spawn', ids: ['wh'], hold: 900 },
      { t: 'camera', shot: 'top' },
      { t: 'clear' },
      { t: 'caption', text: 'Connect the Reporting App to a Redshift data warehouse.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'adding the warehouse but leaving the reports on the orders database too',
    change: { wire: 'web-db' },
    fails: 's1-2',
  },
};

const level74: LevelStory = {
  text: {
    title: 'A Model Goes Live',
    tagline: 'Host a trained model as a private endpoint your app can call.',
    concepts: ['Amazon SageMaker AI', 'Real-time inference', 'Private endpoints'],
    briefing:
      'The data team has trained a recommendations model, but nothing can call it yet. Host it on a SageMaker endpoint in the private subnet and wire the web server to it.',
    docTips: [
      'SageMaker AI (renamed from SageMaker in 2024) hosts a model behind a real-time HTTPS endpoint. Your app calls InvokeEndpoint; an interface VPC endpoint keeps those calls off the public internet.',
    ],
    conceptCard: {
      title: 'Model endpoints',
      summary:
        'A trained model is just a file until something serves it. A SageMaker endpoint loads it onto managed instances and answers prediction requests over HTTPS.',
      analogy: 'A written recipe isn’t a restaurant. The endpoint is the kitchen that cooks it to order.',
      keyTakeaway: 'Serve models behind your app, not straight to the internet.',
    },
    iacSnippet: `resource "aws_sagemaker_endpoint_configuration" "recs" {
  name = "recs"

  production_variants {
    variant_name           = "primary"
    model_name             = aws_sagemaker_model.recs.name
    instance_type          = "ml.m5.large"
    initial_instance_count = 1
  }
}

resource "aws_sagemaker_endpoint" "recs" {
  name                 = "recs"
  endpoint_config_name = aws_sagemaker_endpoint_configuration.recs.name
}`,
  },
  stages: [
    {
      title: 'Model endpoint',
      brief: 'The data team’s recommendations model has nowhere to run.',
      goal: 'Host it on SageMaker in the private subnet and wire the web server to it.',
    },
  ],
  cutscene: {
    stage: board(
      [users(), ec2('web', 0, 0, 'Web Server'), model('modelPub', 2, 1), model('model', 5, 0)],
      [wire('users', 'web'), wire('web', 'model')],
    ),
    start: ['users', 'web'],
    beats: [
      { t: 'wire', ids: ['users--web'] },
      { t: 'caption', text: 'Rio’s data team has trained a model: “people who bought this also bought…”' },
      { t: 'traffic', expect: 'served' },
      { t: 'speech', who: 'founder', text: 'It works on a laptop. How do customers get it?' },
      { t: 'speech', who: 'oncall', text: 'Put it in the public subnet and the mobile app can call it directly.' },
      { t: 'spawn', ids: ['modelPub'] },
      { t: 'camera', shot: 'close', on: 'modelPub' },
      { t: 'callout', on: 'modelPub', title: 'Public Subnet', body: 'Anyone could call it', tone: 'warn' },
      { t: 'speech', who: 'security', text: 'Then anyone can scrape it or run up the bill. Only our app should call the model.' },
      { t: 'clear' },
      { t: 'remove', ids: ['modelPub'] },
      { t: 'spawn', ids: ['model'], hold: 900 },
      { t: 'camera', shot: 'low', on: 'model' },
      { t: 'caption', text: 'Host the model on SageMaker in the private subnet, and wire the web server to it.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'the model in the public subnet',
    change: { move: { model: [2, 0] } },
    fails: 's1-1',
  },
};

const level75: LevelStory = {
  text: {
    title: 'Picks for Everyone',
    tagline: 'Every server behind the load balancer calls the same model.',
    concepts: ['Shared endpoints', 'Real-time inference', 'Identical servers'],
    briefing:
      'Only Server A calls the recommendations model, so half the shoppers get generic picks, depending on where the load balancer sends them. Host one SageMaker endpoint and wire both servers to it.',
    docTips: [
      'One endpoint can serve every app server. Scale the endpoint on invocations per instance, so it grows with traffic rather than with your server count.',
    ],
    conceptCard: {
      title: 'Shared services',
      summary:
        'Behind a load balancer, any request can land on any server, so every server must behave the same. Shared dependencies, such as a model endpoint, are called by all of them and scaled on their own.',
      analogy: 'Every waiter sends orders to the same kitchen. Nobody should get a different menu because of where they sat.',
      keyTakeaway: 'A feature that works on one server has to work on all of them.',
    },
    iacSnippet: `resource "aws_appautoscaling_target" "recs" {
  service_namespace  = "sagemaker"
  resource_id        = "endpoint/\${aws_sagemaker_endpoint.recs.name}/variant/primary"
  scalable_dimension = "sagemaker:variant:DesiredInstanceCount"
  min_capacity       = 1
  max_capacity       = 4
}`,
  },
  stages: [
    {
      title: 'Live predictions',
      brief: 'Every page should show personalised picks, whichever server handles it.',
      goal: 'Wire both servers to one SageMaker endpoint.',
    },
  ],
  cutscene: {
    stage: board(
      [
        users(),
        block('alb', 'alb', -1, 0, { name: 'Load Balancer' }),
        ec2('web1', 1, -1, 'Server A'),
        ec2('web2', 1, 1, 'Server B'),
        model('model', 5, 0),
      ],
      [wire('users', 'alb'), wire('alb', 'web1'), wire('alb', 'web2'), wire('web1', 'model'), wire('web2', 'model')],
    ),
    start: ['users', 'alb', 'web1', 'web2', 'model'],
    beats: [
      { t: 'wire', ids: ['users--alb', 'alb--web1', 'alb--web2', 'web1--model'] },
      { t: 'caption', text: 'Personalised picks are live, on about half of all pages.' },
      { t: 'traffic', expect: 'served' },
      { t: 'camera', shot: 'close', on: 'web2' },
      { t: 'callout', on: 'web2', title: 'Server B', body: 'No model: shows bestsellers', tone: 'warn' },
      { t: 'speech', who: 'founder', text: 'My sister got recommendations. I got “bestsellers”. Same page!' },
      { t: 'speech', who: 'oncall', text: 'The load balancer sent her to Server A and you to Server B. Only A calls the model.' },
      { t: 'camera', shot: 'wide' },
      { t: 'speech', who: 'cto', text: 'Both servers call one shared endpoint. It scales on its own; nobody needs a model per server.' },
      { t: 'clear' },
      { t: 'caption', text: 'Wire both servers to one SageMaker endpoint.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'only one server calling the model',
    change: { unwire: 'web2-model' },
    fails: 's1-2',
  },
};

const level76: LevelStory = {
  text: {
    title: 'Score It in Flight',
    tagline: 'Check every transaction for fraud as it streams past.',
    concepts: ['Event source mappings', 'Stream processing', 'Real-time inference'],
    briefing:
      'Transactions flow into a Kinesis stream, but fraud is only spotted the next day. Add a Lambda function that reads the stream and sends each transaction to a SageMaker fraud model as it arrives.',
    docTips: [
      'A Lambda event source mapping polls the stream for you and invokes your function with batches of records, in order within each shard. Failed batches are retried, so make the function safe to run twice.',
    ],
    conceptCard: {
      title: 'Stream consumers',
      summary:
        'Records on a stream wait to be read. A consumer, such as a Lambda function with an event source mapping, pulls each batch, does the work, and moves its place forward.',
      analogy: 'An inspector at the conveyor belt, checking every parcel as it goes past.',
      keyTakeaway: 'Streams don’t push work anywhere. Something has to read them.',
    },
    iacSnippet: `resource "aws_lambda_event_source_mapping" "score" {
  event_source_arn  = aws_kinesis_stream.transactions.arn
  function_name     = aws_lambda_function.score.arn
  starting_position = "LATEST"
  batch_size        = 100
}`,
  },
  stages: [
    {
      title: 'Streaming triage',
      brief: 'Every transaction should be scored for fraud as it streams past, not the next morning.',
      goal: 'Add a Lambda that reads the stream and calls a SageMaker model.',
    },
  ],
  cutscene: {
    stage: board(
      [
        users(),
        ec2('web', 0, -1, 'Payments Server'),
        kinesis('stream', 6, -1, 'Transactions Stream'),
        block('fn', 'lambda', 4, 1, { name: 'Scoring Function' }),
        model('model', 5, 1, 'Fraud Model'),
      ],
      [wire('users', 'web'), wire('web', 'stream'), wire('stream', 'fn'), wire('fn', 'model')],
    ),
    start: ['users', 'web', 'stream'],
    beats: [
      { t: 'wire', ids: ['users--web', 'web--stream'] },
      { t: 'caption', text: 'Every payment lands on the transactions stream. Nobody reads it until morning.' },
      { t: 'traffic', expect: 'served' },
      { t: 'stat', label: 'Chargebacks last month', value: 4800, prefix: '$', tone: 'bad' },
      { t: 'speech', who: 'finance', text: 'By the time we spot a stolen card, the parcel has already left the warehouse.' },
      { t: 'spawn', ids: ['model'] },
      { t: 'callout', on: 'model', title: 'Fraud Model', body: 'Ready, but nothing calls it', tone: 'warn' },
      { t: 'speech', who: 'oncall', text: 'Can’t the model just read the stream itself?' },
      { t: 'speech', who: 'cto', text: 'An endpoint only answers when it’s asked. A Lambda reads each batch and asks it.' },
      { t: 'spawn', ids: ['fn'], hold: 900 },
      { t: 'camera', shot: 'close', on: 'fn' },
      { t: 'clear' },
      { t: 'caption', text: 'Add a Lambda that reads the stream and calls the fraud model.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'the model reading the stream by itself',
    change: { remove: ['fn'], wire: 'stream-model' },
    fails: 's1-1',
  },
};

const level77: LevelStory = {
  text: {
    title: 'Speed Limit',
    tagline: 'Throttle abusive callers before they reach an expensive model.',
    concepts: ['Amazon API Gateway', 'Throttling', 'Usage plans'],
    briefing:
      'Bots send 2,000 requests a second at the fraud check, drowning the 300 real ones and the model behind them. Put API Gateway in front of the Inference Server and send every request through it.',
    docTips: [
      'API Gateway throttles with a steady rate plus a burst, set per stage, per method or per API key with usage plans. Callers over the limit get HTTP 429. Add AWS WAF for IP and bot rules.',
    ],
    conceptCard: {
      title: 'Throttling',
      summary:
        'A throttle caps how many requests a caller may make per second. Excess requests are turned away at the front door, cheaply, before they reach servers or models that cost money to run.',
      analogy: 'A doorman letting people in at the rate the bar can serve them, not all at once.',
      keyTakeaway: 'Protect an expensive back end with a front door that can say no.',
    },
    iacSnippet: `resource "aws_api_gateway_method_settings" "all" {
  rest_api_id = aws_api_gateway_rest_api.fraud.id
  stage_name  = aws_api_gateway_stage.prod.stage_name
  method_path = "*/*"

  settings {
    throttling_rate_limit  = 500
    throttling_burst_limit = 1000
  }
}`,
  },
  stages: [
    {
      title: 'Bot flood',
      brief: '2,000 bot requests a second are drowning 300 real ones, and the model behind them.',
      goal: 'Send all traffic through API Gateway, keeping errors under 1%.',
    },
  ],
  cutscene: {
    stage: board(
      [users(), block('api', 'apigw', -2, 0, { name: 'API Gateway' }), ec2('web', 0, 0, 'Inference Server'), model('model', 5, 0, 'Fraud Model')],
      [wire('users', 'web'), wire('web', 'model'), wire('users', 'api'), wire('api', 'web')],
    ),
    start: ['users', 'web', 'model'],
    beats: [
      { t: 'wire', ids: ['users--web', 'web--model'] },
      { t: 'caption', text: 'Someone has found the fraud-check API, and is testing stolen cards against it.' },
      { t: 'traffic', rps: 300, botRps: 2000, expect: 'served' },
      { t: 'stat', label: 'Bot requests / s', value: 2000, tone: 'bad' },
      { t: 'camera', shot: 'close', on: 'model' },
      { t: 'callout', on: 'model', title: 'Fraud Model', body: 'Overloaded', tone: 'bad' },
      { t: 'speech', who: 'oncall', text: 'Real customers are timing out behind two thousand fake requests a second.' },
      { t: 'spawn', ids: ['api'], hold: 900 },
      { t: 'camera', shot: 'low', on: 'api' },
      { t: 'speech', who: 'cto', text: 'API Gateway goes in front. Its throttling cuts every caller down to a fair share.' },
      { t: 'speech', who: 'security', text: 'And close the old direct door, or the bots will just keep using it.' },
      { t: 'camera', shot: 'wide' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'API Gateway added, but the old direct door left open',
    change: { wire: 'users-web' },
    fails: 's1-2',
  },
};

const level78: LevelStory = {
  text: {
    title: 'Remember the Answer',
    tagline: 'Cache repeat predictions instead of running the model again.',
    concepts: ['Prediction caching', 'Amazon ElastiCache', 'Inference cost'],
    briefing:
      'Every product page waits 70 ms for a prediction, and most pages ask the same question over and over. Add a Redis cache the App Server checks before calling the model, and get pages under 60 ms.',
    docTips: [
      'Key cached predictions on the model’s inputs (here, the product ID) and give them a TTL, so fresh picks appear after the model is retrained.',
    ],
    conceptCard: {
      title: 'Caching inference',
      summary:
        'Many prediction requests repeat. Caching each result for a few minutes turns a 70 ms model call into a sub-millisecond lookup, and the endpoint only handles the misses.',
      analogy: 'A forecaster doesn’t rerun the supercomputer for every caller. They read out this morning’s forecast.',
      keyTakeaway: 'If the same inputs give the same answer, work it out once and cache it.',
    },
    iacSnippet: `resource "aws_elasticache_serverless_cache" "predictions" {
  engine             = "redis"
  name               = "predictions"
  subnet_ids         = aws_subnet.private[*].id
  security_group_ids = [aws_security_group.cache.id]
}`,
  },
  stages: [
    {
      title: 'Cache predictions',
      brief: 'Each prediction takes 70 ms, and most visitors ask the same questions.',
      goal: 'Cache predictions in Redis and get pages under 60 ms.',
    },
  ],
  cutscene: {
    stage: board(
      [users(), ec2('web', 0, 0, 'App Server'), model('model', 5, 0), block('cache', 'redis', 5, 1, { name: 'Prediction Cache' })],
      [wire('users', 'web'), wire('web', 'model'), wire('web', 'cache')],
    ),
    start: ['users', 'web', 'model'],
    beats: [
      { t: 'wire', ids: ['users--web', 'web--model'] },
      { t: 'caption', text: 'Product pages now wait for the Recommender before they load.' },
      { t: 'traffic', expect: 'served' },
      { t: 'stat', label: 'Page latency', value: 110, unit: 'ms', tone: 'bad' },
      { t: 'camera', shot: 'close', on: 'model' },
      { t: 'callout', on: 'model', title: 'Recommender', body: '70 ms per prediction', tone: 'warn' },
      { t: 'speech', who: 'oncall', text: 'Everyone viewing the same product gets the same picks, and we run the model every single time.' },
      { t: 'speech', who: 'finance', text: 'And every repeat call is endpoint time we pay for.' },
      { t: 'spawn', ids: ['cache'], hold: 900 },
      { t: 'camera', shot: 'orbit', on: 'cache' },
      { t: 'speech', who: 'cto', text: 'Keep recent predictions in Redis. The app checks there first and asks the model only on a miss.' },
      { t: 'clear' },
      { t: 'caption', text: 'Cache predictions so pages load in under 60 ms.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'the cache wired to the model instead of the app',
    change: { unwire: 'web-cache', wire: 'model-cache' },
    fails: 's1-1',
  },
};

const level79: LevelStory = {
  text: {
    title: 'Live Numbers',
    tagline: 'Feed the warehouse straight from the stream, seconds after each order.',
    concepts: ['Redshift streaming ingestion', 'Real-time analytics', 'Materialised views'],
    briefing:
      'The dashboards show yesterday’s orders, because the warehouse loads once a night. Connect the Orders Stream to Redshift so new orders reach the dashboards within seconds.',
    docTips: [
      'Redshift streaming ingestion reads a Kinesis data stream into a materialised view, with no staging in S3. Turn on auto refresh and new records appear within seconds.',
    ],
    conceptCard: {
      title: 'Streaming ingestion',
      summary:
        'Instead of loading a file every night, the warehouse reads the event stream continuously. Dashboards built on it are seconds behind reality instead of a day.',
      analogy: 'A live scoreboard instead of tomorrow morning’s newspaper.',
      keyTakeaway: 'Let analytics read the stream your app already writes, rather than asking the app to write twice.',
    },
    iacSnippet: null,
  },
  stages: [
    {
      title: 'Live dashboards',
      brief: 'Executives want new orders in their dashboards within seconds, not tomorrow.',
      goal: 'Stream the orders from Kinesis into Redshift.',
    },
  ],
  cutscene: {
    stage: board(
      [users(), ec2('web', 0, 0, 'Web Server'), kinesis('stream', 6, 0, 'Orders Stream'), block('wh', 'redshift', 5, 0, { name: 'Warehouse' })],
      [wire('users', 'web'), wire('web', 'stream'), wire('stream', 'wh')],
    ),
    start: ['users', 'web', 'stream'],
    beats: [
      { t: 'wire', ids: ['users--web', 'web--stream'] },
      { t: 'caption', text: 'Rio’s executives get yesterday’s sales every morning, in a spreadsheet.' },
      { t: 'traffic', expect: 'served' },
      { t: 'speech', who: 'founder', text: 'We change prices during a sale and can’t see the effect until tomorrow.' },
      { t: 'spawn', ids: ['wh'], hold: 900 },
      { t: 'camera', shot: 'close', on: 'wh' },
      { t: 'speech', who: 'oncall', text: 'I could have the web server insert each order into Redshift as it happens.' },
      { t: 'callout', on: 'wh', title: 'Warehouse', body: 'Built for bulk loads, not single inserts', tone: 'warn' },
      { t: 'speech', who: 'cto', text: 'The orders are already on a stream. Redshift can read it directly, within seconds.' },
      { t: 'camera', shot: 'wide' },
      { t: 'clear' },
      { t: 'caption', text: 'Stream the orders from Kinesis into Redshift.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'the web server inserting orders into Redshift itself',
    change: { unwire: 'stream-wh', wire: 'web-wh' },
    fails: 's1-1',
  },
};

const level80: LevelStory = {
  text: {
    title: 'Fraud Engine',
    tagline: 'Assessment: score every payment, keep the audit trail, and answer in under 80 ms.',
    concepts: ['API Gateway', 'AWS Lambda', 'SageMaker AI', 'Kinesis', 'Redshift', 'ElastiCache'],
    briefing:
      'Every payment needs a fraud score before it’s approved, with bots kept out, every decision on record for the regulator, and an answer in under 80 ms. Build it from an empty account, one stage at a time.',
    docTips: [
      'Put API Gateway in front: its throttling stops a bot flood before it costs you a single Lambda run or model call.',
      'Writing each decision to a stream keeps the audit trail off the checkout path. The customer gets an answer while Kinesis delivers the record in the background.',
      'Cache scores for repeat inputs, such as the same card and merchant within a few minutes. Keep the TTL short so new fraud patterns still reach the model.',
    ],
    conceptCard: {
      title: 'Real-time ML pipelines',
      summary:
        'A production model needs more than an endpoint: a guarded front door, code that calls it, a record of every decision, and a cache for repeat answers. Each piece is a service you’ve already used.',
      analogy: 'Passport control: a queue barrier, an officer who checks each passport, a log of every decision, and a fast lane for frequent travellers.',
      keyTakeaway: 'A synchronous path for the answer, an asynchronous path for the record, and a cache for the repeats.',
    },
    iacSnippet: `resource "aws_lambda_function" "score" {
  function_name = "score-payment"
  role          = aws_iam_role.score.arn
  runtime       = "python3.13"
  handler       = "app.handler"
  filename      = "score.zip"
  timeout       = 3

  environment {
    variables = {
      ENDPOINT_NAME = aws_sagemaker_endpoint.fraud.name
      AUDIT_STREAM  = aws_kinesis_stream.decisions.name
    }
  }
}`,
  },
  stages: [
    {
      title: 'Score every payment',
      brief: 'Fraudsters and 3,000 bot requests a second are hitting the payments API.',
      goal: 'Build API Gateway → Lambda → SageMaker, keeping errors under 1%.',
    },
    {
      title: 'Audit trail',
      brief: 'The regulator wants every fraud decision stored in the warehouse.',
      goal: 'Stream each decision through Kinesis into Redshift.',
    },
    {
      title: 'Faster answers',
      brief: 'Checkout waits 133 ms for a fraud score. The target is 80 ms.',
      goal: 'Cache repeat predictions and get latency under 80 ms.',
    },
  ],
  cutscene: {
    stage: board(
      [
        users(),
        block('api', 'apigw', -2, 0, { name: 'Payments API' }),
        block('fn', 'lambda', 4, -1, { name: 'Scoring Function' }),
        model('model', 5, -1, 'Fraud Model'),
        kinesis('stream', 6, 1, 'Decisions Stream'),
        block('wh', 'redshift', 5, 1, { name: 'Audit Warehouse' }),
      ],
      [wire('users', 'api'), wire('api', 'fn'), wire('fn', 'model'), wire('fn', 'stream'), wire('stream', 'wh')],
    ),
    start: ['users'],
    beats: [
      { t: 'caption', text: 'Rio’s shop now takes payments from 40 countries, and the fraudsters have noticed.' },
      { t: 'spawn', ids: ['api', 'fn', 'model'] },
      { t: 'wire', ids: ['users--api', 'api--fn', 'fn--model'] },
      { t: 'traffic', rps: 500, botRps: 3000, expect: 'served' },
      { t: 'stat', label: 'Bot requests / s', value: 3000, tone: 'bad' },
      { t: 'speech', who: 'security', text: 'Every payment gets a fraud score, and not one bot request reaches the model.' },
      { t: 'spawn', ids: ['stream', 'wh'] },
      { t: 'wire', ids: ['fn--stream', 'stream--wh'] },
      { t: 'camera', shot: 'top' },
      { t: 'speech', who: 'finance', text: 'And the regulator wants every decision on record, ready to query.' },
      { t: 'camera', shot: 'close', on: 'fn' },
      { t: 'stat', label: 'Checkout waits', value: 133, unit: 'ms', tone: 'warn' },
      { t: 'speech', who: 'cto', text: 'You’ve built every piece already. Now build them together, and answer in under 80 ms.' },
      { t: 'camera', shot: 'wide' },
    ],
  },
  wrong: {
    stage: 3,
    why: 'the cache wired to the model instead of the function',
    change: { unwire: 'fn-cache', wire: 'model-cache' },
    fails: 's3-1',
  },
};

export const MODULE_8_STORIES: Record<number, LevelStory> = {
  71: level71,
  72: level72,
  73: level73,
  74: level74,
  75: level75,
  76: level76,
  77: level77,
  78: level78,
  79: level79,
  80: level80,
};
