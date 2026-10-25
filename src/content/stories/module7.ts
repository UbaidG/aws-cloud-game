/**
 * Module 7: Databases. Rio's shop has servers that survive anything; now its data has to.
 * Orders move off the web server, the database learns to fail over and scale its reads, and
 * a new community feed, The Table, goes viral.
 */

import { block, board, users, wire } from '../build';
import type { BlockConfig } from '../../engine/types';
import type { LevelStory } from '../story';

const ec2 = (id: string, gridX: number, gridZ = 0, name?: string) => block(id, 'ec2', gridX, gridZ, { name });
const rds = (id: string, gridX: number, gridZ = 0, name?: string, config?: Partial<BlockConfig>) =>
  block(id, 'rds', gridX, gridZ, { name, config });
const redis = (id: string, gridX: number, gridZ = 0, name = 'Redis Cache') => block(id, 'redis', gridX, gridZ, { name });
const alb = (gridX = -1, gridZ = 0) => block('alb', 'alb', gridX, gridZ, { name: 'Load Balancer' });

const PG_ANY = { protocol: 'tcp', port: 5432, source: '0.0.0.0/0' } as const;

const level61: LevelStory = {
  text: {
    title: 'Orders Need a Home',
    tagline: 'Move the shop’s data off the web server and into a managed database.',
    concepts: ['Amazon RDS', 'Private subnets', 'Managed databases'],
    briefing:
      'Orders are saved to a file on the web server, so every replaced server takes its orders with it. Add an Amazon RDS database in the private subnet and wire the web server to it.',
    docTips: [
      'RDS runs PostgreSQL, MySQL, MariaDB, Oracle or SQL Server for you, with patching, backups and point-in-time recovery. Set it to “not publicly accessible” and give it private subnets.',
    ],
    conceptCard: {
      title: 'Amazon RDS',
      summary:
        'RDS is a managed relational database. AWS runs the server, the engine upgrades and the nightly backups; you get a connection endpoint and write SQL.',
      analogy: 'A vault in the back room: staff on the shop floor can reach it, people on the street can’t.',
      keyTakeaway: 'Keep data off your web servers, and keep the database where only your app can reach it.',
    },
    iacSnippet: `resource "aws_db_instance" "orders" {
  identifier                  = "orders"
  engine                      = "postgres"
  instance_class              = "db.t4g.micro"
  allocated_storage           = 20
  username                    = "rio"
  manage_master_user_password = true
  db_subnet_group_name        = aws_db_subnet_group.private.name
  vpc_security_group_ids      = [aws_security_group.db.id]
  publicly_accessible         = false
  storage_encrypted           = true
}`,
  },
  stages: [
    {
      title: 'A home for orders',
      brief: 'Every order lives in a file on the web server. Replace the server and the orders go with it.',
      goal: 'Add an RDS database in the private subnet and wire the web server to it.',
    },
  ],
  cutscene: {
    stage: board(
      [users(), ec2('web', 0, 0, 'Web Server'), rds('dbPub', 2, 0, 'Orders DB'), rds('db', 5, 0, 'Orders DB')],
      [wire('users', 'web')],
    ),
    start: ['users', 'web'],
    illegal: ['dbPub'],
    beats: [
      { t: 'wire', ids: ['users--web'] },
      { t: 'caption', text: 'Rio’s orders live in orders.csv, on the web server’s own disk.' },
      { t: 'traffic', expect: 'served' },
      { t: 'camera', shot: 'close', on: 'web' },
      { t: 'callout', on: 'web', title: 'orders.csv', body: 'New server, empty file', tone: 'bad' },
      { t: 'stat', label: 'Orders lost', value: 212, tone: 'bad' },
      { t: 'speech', who: 'founder', text: 'We replaced a sick server, like you taught us. Its orders went with it.' },
      { t: 'speech', who: 'oncall', text: 'I’ll put a database next to the web server, in the public subnet. Easy to reach.' },
      { t: 'spawn', ids: ['dbPub'] },
      { t: 'callout', on: 'dbPub', title: 'Public Subnet', body: 'One route from the internet', tone: 'bad' },
      { t: 'speech', who: 'security', text: 'Easy for everyone else to reach too. Customer data goes in the private subnet.' },
      { t: 'clear' },
      { t: 'remove', ids: ['dbPub'] },
      { t: 'camera', shot: 'wide' },
      { t: 'spawn', ids: ['db'] },
      { t: 'caption', text: 'Add a managed database in the private subnet, and wire the web server to it.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'a database in the public subnet, for “easy access”',
    change: { move: { db: [2, 0] } },
    fails: 'zone.db_exposed',
  },
};

const level62: LevelStory = {
  text: {
    title: 'Hot Standby',
    tagline: 'Keep a live copy of the database in a second zone, ready to take over.',
    concepts: ['RDS Multi-AZ', 'Synchronous replication', 'Automatic failover'],
    briefing:
      'The Orders DB runs in one Availability Zone. If that zone fails, the shop stops taking orders until someone restores a backup. Turn on Multi-AZ so a standby in the other zone takes over by itself.',
    docTips: [
      'With Multi-AZ, every write is copied synchronously to a standby in another zone. On failure, RDS points the same endpoint at the standby, usually within one to two minutes.',
    ],
    conceptCard: {
      title: 'Multi-AZ deployments',
      summary:
        'RDS keeps a standby copy in a second Availability Zone and replicates every write to it. The standby takes no traffic until the primary fails; then it’s promoted automatically.',
      analogy: 'An understudy who learns every line each night and steps on stage the moment the lead falls ill.',
      keyTakeaway: 'Multi-AZ is for surviving failures. It roughly doubles the database bill and adds no read capacity.',
    },
    iacSnippet: `resource "aws_db_instance" "orders" {
  identifier                  = "orders"
  engine                      = "postgres"
  instance_class              = "db.m6g.large"
  allocated_storage           = 100
  username                    = "rio"
  manage_master_user_password = true
  db_subnet_group_name        = aws_db_subnet_group.private.name
  multi_az                    = true
}`,
  },
  stages: [
    {
      title: 'Standby copy',
      brief: 'The Orders DB lives in one Availability Zone. If that zone fails, every order stops.',
      goal: 'Turn on Multi-AZ for the database.',
      hint: 'Select the Orders DB and switch Multi-AZ on in the inspector.',
    },
  ],
  cutscene: {
    stage: board([users(), ec2('web', 0, 0, 'Web Server'), rds('db', 5, 0, 'Orders DB')], [wire('users', 'web'), wire('web', 'db')]),
    start: ['users', 'web', 'db'],
    beats: [
      { t: 'wire', ids: ['users--web', 'web--db'] },
      { t: 'caption', text: 'Tuesday, 3:12 a.m. Orders trickle in from night owls in other time zones.' },
      { t: 'traffic', expect: 'served' },
      { t: 'crash', id: 'db' },
      { t: 'camera', shot: 'close', on: 'db' },
      { t: 'callout', on: 'db', title: 'us-east-1a', body: 'Storage failure', tone: 'bad' },
      { t: 'traffic', expect: 'blocked' },
      { t: 'stat', label: 'Orders failing', value: 100, unit: '%', tone: 'bad' },
      { t: 'speech', who: 'oncall', text: 'Restoring last night’s backup takes an hour, and we lose every order since midnight.' },
      { t: 'camera', shot: 'top' },
      { t: 'speech', who: 'cto', text: 'Multi-AZ keeps a live standby in the other zone. If the primary dies, RDS switches over by itself.' },
      { t: 'clear' },
      { t: 'caption', text: 'Turn on Multi-AZ for the Orders DB.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'a read replica mistaken for a standby',
    change: { set: { db: { multiAZ: false, readReplica: true } } },
    fails: 's1-1',
  },
};

const level63: LevelStory = {
  text: {
    title: 'Too Many Readers',
    tagline: 'Spread read-only queries across a copy of the database.',
    concepts: ['Read replicas', 'Read scaling', 'Caching'],
    briefing:
      'Rio’s new catalogue drew 2,000 reads a second, and the database handles 1,500. Almost every query is a read. Take enough of them off the primary database to bring errors under 1%.',
    docTips: [
      'RDS read replicas copy data asynchronously, so they can lag slightly behind. Point product pages and reports at the replica’s endpoint, and keep writes on the primary.',
    ],
    conceptCard: {
      title: 'Read replicas',
      summary:
        'A read replica is a copy of the database that serves read-only queries. Adding one splits the reading between two machines, while writes still go to the primary.',
      analogy: 'A library buying a second copy of its most popular book, so two people can read it at once.',
      keyTakeaway: 'Scale reads with replicas or a cache. A Multi-AZ standby is for failover, not for load.',
    },
    iacSnippet: `resource "aws_db_instance" "catalogue_replica" {
  identifier          = "catalogue-replica-1"
  replicate_source_db = aws_db_instance.catalogue.identifier
  instance_class      = "db.r6g.large"
}`,
  },
  stages: [
    {
      title: 'Read bottleneck',
      brief: '2,000 reads a second. The database handles 1,500.',
      goal: 'Take read load off the database, keeping errors under 1%.',
      hint: 'Add a read replica to the database, or put a Redis cache beside it for the servers to read.',
    },
  ],
  cutscene: {
    stage: board(
      [users(), alb(), ec2('web1', 1, -1, 'Server A'), ec2('web2', 1, 1, 'Server B'), rds('db', 5, 0, 'Catalogue DB')],
      [wire('users', 'alb'), wire('alb', 'web1'), wire('alb', 'web2'), wire('web1', 'db'), wire('web2', 'db')],
    ),
    start: ['users', 'alb', 'web1', 'web2', 'db'],
    beats: [
      { t: 'wire', ids: ['users--alb', 'alb--web1', 'alb--web2', 'web1--db', 'web2--db'] },
      { t: 'caption', text: 'Rio emails the new catalogue to every customer. They all open it at once.' },
      { t: 'traffic', rps: 2000, expect: 'served' },
      { t: 'stat', label: 'Catalogue reads / s', value: 2000, tone: 'warn' },
      { t: 'camera', shot: 'low', on: 'db' },
      { t: 'callout', on: 'db', title: 'Catalogue DB', body: 'Tops out at 1,500 queries/s', tone: 'bad' },
      { t: 'speech', who: 'oncall', text: 'We have Multi-AZ on the orders database. Can a standby like that take some of these reads?' },
      { t: 'speech', who: 'cto', text: 'A standby only waits for a failure. A read replica answers reads. So does a Redis cache.' },
      { t: 'camera', shot: 'wide' },
      { t: 'clear' },
      { t: 'caption', text: 'Take enough reads off the database to bring errors under 1%.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'Multi-AZ, expecting the standby to share the reads',
    change: { set: { db: { multiAZ: true, readReplica: false } } },
    fails: 's1-1',
  },
};

const level64: LevelStory = {
  text: {
    title: 'A Million Likes',
    tagline: 'Store simple key lookups in a table that never needs a server.',
    concepts: ['Amazon DynamoDB', 'Key-value data', 'Serverless databases'],
    briefing:
      'The new heart button sends millions of likes a day, each one a lookup by product ID. Store them in a DynamoDB table and wire the Likes Function to it.',
    docTips: [
      'Design a DynamoDB table around how you read it: here the partition key is the product ID. On-demand mode bills per request, with no capacity to plan.',
    ],
    conceptCard: {
      title: 'Amazon DynamoDB',
      summary:
        'DynamoDB is a serverless key-value and document database. You read and write items by key in single-digit milliseconds at any scale, and there are no servers to patch or resize.',
      analogy: 'A cloakroom: hand over the ticket number and get your coat straight back, no searching.',
      keyTakeaway: 'If you always look data up by its key, a key-value store beats a relational database on speed and effort.',
    },
    iacSnippet: `resource "aws_dynamodb_table" "likes" {
  name         = "likes"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "product_id"

  attribute {
    name = "product_id"
    type = "S"
  }
}`,
  },
  stages: [
    {
      title: 'Key-value speed',
      brief: 'Likes are simple lookups by product ID, millions of them a day.',
      goal: 'Add a DynamoDB table and wire the Likes Function to it.',
    },
  ],
  cutscene: {
    stage: board(
      [
        users(),
        block('api', 'apigw', -2, 0, { name: 'Likes API' }),
        block('fn', 'lambda', 4, 0, { name: 'Likes Function' }),
        rds('sql', 5, -2, 'Orders DB'),
        block('table', 'dynamodb', 6, 0, { name: 'Likes Table' }),
      ],
      [wire('users', 'api'), wire('api', 'fn'), wire('fn', 'table')],
    ),
    start: ['users', 'api', 'fn'],
    beats: [
      { t: 'wire', ids: ['users--api', 'api--fn'] },
      { t: 'caption', text: 'Rio adds a heart button to every product. Customers press it constantly.' },
      { t: 'traffic', expect: 'served' },
      { t: 'stat', label: 'Likes / day', value: 4000000, tone: 'warn' },
      { t: 'speech', who: 'oncall', text: 'Each like is one tiny lookup: product ID in, count out. I’ll add a table to the orders database.' },
      { t: 'spawn', ids: ['sql'] },
      { t: 'callout', on: 'sql', title: 'Orders DB', body: 'Already busy with checkout', tone: 'warn' },
      { t: 'speech', who: 'cto', text: 'Leave checkout’s database to checkout. Lookups by key are what DynamoDB is built for.' },
      { t: 'clear' },
      { t: 'spawn', ids: ['table'], hold: 900 },
      { t: 'camera', shot: 'close', on: 'table' },
      { t: 'caption', text: 'Give the likes their own DynamoDB table, and wire the function to it.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'likes kept in a SQL database',
    change: { remove: ['table'], add: 'sql:rds@6,0', wire: 'fn-sql' },
    fails: 's1-1',
  },
};

const level65: LevelStory = {
  text: {
    title: 'No Servers Left',
    tagline: 'Give a function that scales in seconds a database that keeps up.',
    concepts: ['Lambda with DynamoDB', 'Connection limits', 'Serverless scaling'],
    briefing:
      'The wishlist API runs on Lambda, which scales out in seconds, but every copy queues for one SQL database that tops out at 1,500 requests a second. Replace it with DynamoDB so the whole stack scales together.',
    docTips: [
      'Thousands of concurrent Lambda functions can exhaust a relational database’s connections. RDS Proxy pools them; DynamoDB avoids the problem, because every call is a stateless HTTPS request.',
    ],
    conceptCard: {
      title: 'Serverless all the way down',
      summary:
        'A serverless stack is only as elastic as its least elastic part. DynamoDB scales with Lambda because it has no connection pool to fill and no instance to resize.',
      analogy: 'Opening fifty tills does nothing if every cashier still queues for the one manager with the key.',
      keyTakeaway: 'When the front end scales by itself, choose a data store that does too.',
    },
    iacSnippet: `resource "aws_dynamodb_table" "wishlists" {
  name         = "wishlists"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "customer_id"
  range_key    = "product_id"

  attribute {
    name = "customer_id"
    type = "S"
  }

  attribute {
    name = "product_id"
    type = "S"
  }
}`,
  },
  stages: [
    {
      title: 'Serverless all the way',
      brief: '2,800 requests a second, and the SQL database tops out at 1,500.',
      goal: 'Replace the SQL database with DynamoDB, keeping errors under 1%.',
    },
  ],
  cutscene: {
    stage: board(
      [
        users(),
        block('api', 'apigw', -2, 0, { name: 'Wishlist API' }),
        block('fn', 'lambda', 4, 0, { name: 'Function' }),
        rds('db', 5, 0, 'SQL Database'),
        block('table', 'dynamodb', 6, 1, { name: 'Wishlists' }),
      ],
      [wire('users', 'api'), wire('api', 'fn'), wire('fn', 'db')],
    ),
    start: ['users', 'api', 'fn', 'db'],
    beats: [
      { t: 'wire', ids: ['users--api', 'api--fn', 'fn--db'] },
      { t: 'caption', text: 'Gift-guide week. Wishlist requests climb past 2,800 a second.' },
      { t: 'traffic', rps: 2800, expect: 'served' },
      { t: 'camera', shot: 'close', on: 'db' },
      { t: 'callout', on: 'db', title: 'Too many connections', body: 'Every Lambda copy opens its own', tone: 'bad' },
      { t: 'stat', label: 'Database limit', value: 1500, unit: '/s', tone: 'bad' },
      { t: 'speech', who: 'oncall', text: 'Lambda scaled out in seconds. The database didn’t, and now it’s the bottleneck.' },
      { t: 'speech', who: 'cto', text: 'Then let the data tier scale the same way. Swap the SQL database for DynamoDB.' },
      { t: 'spawn', ids: ['table'], hold: 900 },
      { t: 'camera', shot: 'orbit', on: 'table' },
      { t: 'clear' },
      { t: 'caption', text: 'Replace the SQL database with DynamoDB and serve all 2,800 requests a second.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'keeping the SQL database behind Lambda',
    change: { remove: ['table'], add: 'db:rds@5,0', wire: 'fn-db' },
    fails: 's1-2',
  },
};

const level66: LevelStory = {
  text: {
    title: 'Faster Than Disk',
    tagline: 'Answer the same question from memory instead of asking the database again.',
    concepts: ['Amazon ElastiCache', 'Redis', 'In-memory caching'],
    briefing:
      'The new feed takes 150 ms because every request reads the same posts from the database. Add a Redis cache that the Feed Server checks first, and bring the feed under 70 ms.',
    docTips: [
      'ElastiCache runs Valkey, Redis OSS or Memcached for you. Give cached items a TTL (time to live) so stale posts expire on their own.',
    ],
    conceptCard: {
      title: 'In-memory caching',
      summary:
        'A cache keeps recent answers in RAM. Reading from memory takes well under a millisecond, while a database query has to plan, read from disk and return rows.',
      analogy: 'Chalking today’s specials on a board by the till, instead of fetching the menu book for every customer.',
      keyTakeaway: 'Cache what is read often and changes rarely. The fastest query is the one you don’t run.',
    },
    iacSnippet: `resource "aws_elasticache_replication_group" "feed" {
  replication_group_id = "feed-cache"
  description          = "Feed cache"
  engine               = "redis"
  node_type            = "cache.t4g.small"
  num_cache_clusters   = 2
  subnet_group_name    = aws_elasticache_subnet_group.private.name
  security_group_ids   = [aws_security_group.cache.id]
}`,
  },
  stages: [
    {
      title: 'RAM beats disk',
      brief: 'The feed takes 150 ms to load. The target is under 70 ms.',
      goal: 'Add a Redis cache for the Feed Server and get the feed under 70 ms.',
    },
  ],
  cutscene: {
    stage: board(
      [users(), ec2('web', 0, 0, 'Feed Server'), rds('db', 5, 0, 'Posts DB'), redis('cache', 5, 1)],
      [wire('users', 'web'), wire('web', 'db'), wire('web', 'cache')],
    ),
    start: ['users', 'web', 'db'],
    beats: [
      { t: 'wire', ids: ['users--web', 'web--db'] },
      { t: 'caption', text: 'Rio launches The Table, a feed where customers post what they cooked.' },
      { t: 'traffic', expect: 'served' },
      { t: 'stat', label: 'Feed load time', value: 150, unit: 'ms', tone: 'bad' },
      { t: 'speech', who: 'founder', text: 'People scroll away before the photos even load.' },
      { t: 'camera', shot: 'close', on: 'db' },
      { t: 'speech', who: 'oncall', text: 'Every scroll asks the database the same question: what are the latest twenty posts?' },
      { t: 'spawn', ids: ['cache'], hold: 900 },
      { t: 'camera', shot: 'close', on: 'cache' },
      { t: 'speech', who: 'cto', text: 'So keep the answer in memory. Redis replies in under a millisecond.' },
      { t: 'camera', shot: 'wide' },
      { t: 'clear' },
      { t: 'caption', text: 'Add a Redis cache for the Feed Server and get the feed under 70 ms.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'a cache wired to the database instead of the app',
    change: { unwire: 'web-cache', wire: 'db-cache' },
    fails: 'link.data_to_data',
  },
};

const level67: LevelStory = {
  text: {
    title: 'When the Cache Misses',
    tagline: 'Read the cache first, fall back to the database, then fill the cache.',
    concepts: ['Cache-aside', 'Lazy loading', 'Source of truth'],
    briefing:
      'The App Server only talks to Redis, so anything that isn’t cached has nowhere to come from. Wire the app to the Main DB as well: the cache answers hits, and the database answers misses.',
    docTips: [
      'Cache-aside (lazy loading): read the cache; on a miss, read the database and write the result to the cache with a TTL. On a write, update the database and delete the cached key.',
    ],
    conceptCard: {
      title: 'Cache-aside',
      summary:
        'In the cache-aside pattern the application holds the logic: check the cache, fall back to the database on a miss, and store what it fetched. The database stays the source of truth.',
      analogy: 'Checking your notebook for a phone number, ringing directory enquiries only when it isn’t there, then writing it down.',
      keyTakeaway: 'A cache is a copy, not a database. Something durable must always sit behind it.',
    },
    iacSnippet: null,
  },
  stages: [
    {
      title: 'Cache-aside',
      brief: 'The app reads only from Redis. Anything that isn’t cached has nowhere to come from.',
      goal: 'Wire the app to the database as well, keeping latency under 70 ms.',
    },
  ],
  cutscene: {
    stage: board(
      [users(), ec2('web', 0, 0, 'App Server'), redis('cache', 5, 1), rds('db', 5, -1, 'Main DB')],
      [wire('users', 'web'), wire('web', 'cache')],
    ),
    start: ['users', 'web', 'cache', 'db'],
    beats: [
      { t: 'wire', ids: ['users--web', 'web--cache'] },
      { t: 'caption', text: 'Dev has a bold idea: read everything from Redis and stop asking the database.' },
      { t: 'traffic', expect: 'served' },
      { t: 'speech', who: 'oncall', text: 'Under a millisecond for every read. Why keep the slow path at all?' },
      { t: 'crash', id: 'cache' },
      { t: 'camera', shot: 'close', on: 'cache' },
      { t: 'callout', on: 'cache', title: 'Node replaced', body: 'Cache is empty: 0 keys', tone: 'bad' },
      { t: 'traffic', expect: 'blocked' },
      { t: 'stat', label: 'Cache hit rate', value: 0, unit: '%', tone: 'bad' },
      { t: 'speech', who: 'cto', text: 'A cache forgets. On a miss the app reads the database, then writes the answer back to the cache.' },
      { t: 'camera', shot: 'low', on: 'db' },
      { t: 'callout', on: 'db', title: 'Main DB', body: 'Not wired to the app', tone: 'warn' },
      { t: 'clear' },
      { t: 'caption', text: 'Wire the app to the database too, so a miss still gets an answer.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'treating the cache as the database',
    change: { remove: ['db'] },
    fails: 's1-2',
  },
};

const level68: LevelStory = {
  text: {
    title: 'Years of Data',
    tagline: 'Load the data lake into a warehouse built for big questions.',
    concepts: ['Amazon Redshift', 'Data warehouses', 'Columnar storage'],
    briefing:
      'Tom needs SQL reports across five years of data in the S3 data lake. Add a Redshift warehouse in the private subnet and load the lake into it.',
    docTips: [
      'Redshift loads data from S3 in bulk with the COPY command, in parallel across its nodes. For occasional ad hoc queries, Amazon Athena can query the files in S3 directly.',
    ],
    conceptCard: {
      title: 'Data warehouses',
      summary:
        'Redshift stores data by column and spreads each query across many nodes, so scanning billions of rows for a few columns is fast. It’s built for analysis, not for taking orders one at a time.',
      analogy: 'A till records one sale at a time. The accountant’s ledger adds up the whole year in one go.',
      keyTakeaway: 'Run analytics in a warehouse, away from the database your customers are using.',
    },
    iacSnippet: `resource "aws_redshift_cluster" "analytics" {
  cluster_identifier        = "analytics"
  node_type                 = "ra3.xlplus"
  number_of_nodes           = 2
  database_name             = "analytics"
  master_username           = "admin_user"
  manage_master_password    = true
  cluster_subnet_group_name = aws_redshift_subnet_group.private.name
  publicly_accessible       = false
  encrypted                 = true
  iam_roles                 = [aws_iam_role.redshift_s3_read.arn]
}`,
  },
  stages: [
    {
      title: 'Analytics',
      brief: 'Tom wants SQL reports across years of data in the S3 data lake.',
      goal: 'Add Redshift in the private subnet and load the data lake into it.',
    },
  ],
  cutscene: {
    stage: board(
      [users(), ec2('web', 0, 0, 'App Server'), block('lake', 's3', 6, 0, { name: 'Data Lake' }), block('wh', 'redshift', 5, 0, { name: 'Warehouse' })],
      [wire('users', 'web'), wire('web', 'lake'), wire('lake', 'wh')],
    ),
    start: ['users', 'web', 'lake'],
    beats: [
      { t: 'wire', ids: ['users--web', 'web--lake'] },
      { t: 'caption', text: 'Five years of orders, clicks and returns, sitting in S3 as millions of files.' },
      { t: 'traffic', expect: 'served' },
      { t: 'camera', shot: 'close', on: 'lake' },
      { t: 'callout', on: 'lake', title: 'Data Lake', body: '4.2 TB of CSV and Parquet', tone: 'info' },
      { t: 'speech', who: 'finance', text: 'I need revenue by region by month for the board. Can’t I just run SQL on that?' },
      { t: 'speech', who: 'oncall', text: 'Not from the app server. It would grind for hours and slow the shop down.' },
      { t: 'spawn', ids: ['wh'], hold: 900 },
      { t: 'camera', shot: 'low', on: 'wh' },
      { t: 'speech', who: 'cto', text: 'Load it into Redshift, a warehouse built for exactly these questions. Private subnet, of course.' },
      { t: 'clear' },
      { t: 'caption', text: 'Put Redshift in the private subnet and load the lake into it.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'Redshift in the public subnet so analysts can reach it',
    change: { move: { wh: [2, 0] } },
    fails: 's1-1',
  },
};

const level69: LevelStory = {
  text: {
    title: 'Lock the Vault',
    tagline: 'Close a database to everything but your app, and encrypt what it stores.',
    concepts: ['Security groups', 'Encryption at rest', 'Defence in depth'],
    briefing:
      'The Customer DB accepts PostgreSQL connections from any address and stores its data unencrypted. Restrict port 5432 to the VPC and turn on encryption, without cutting off the web server.',
    docTips: [
      'Better still, use the web servers’ security group as the source instead of an address range. An unencrypted RDS instance can’t be encrypted in place: copy a snapshot with encryption on, then restore from it.',
    ],
    conceptCard: {
      title: 'Defence in depth',
      summary:
        'A private subnet, a tight security group and encryption at rest are separate layers. Each one still protects the data when another is misconfigured.',
      analogy: 'A safe, inside a locked office, inside a building with a guard. Losing one key doesn’t open the safe.',
      keyTakeaway: 'Never rely on one layer. Restrict who can connect, and encrypt whatever they could steal.',
    },
    iacSnippet: `resource "aws_security_group_rule" "db_from_web" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = aws_security_group.db.id
  source_security_group_id = aws_security_group.web.id
}`,
  },
  stages: [
    {
      title: 'Exposed',
      brief: 'The database accepts connections from anywhere and stores its data unencrypted.',
      goal: 'Restrict port 5432 to the VPC and turn on encryption, keeping the web server connected.',
    },
  ],
  cutscene: {
    stage: board(
      [users(), alb(), ec2('web', 1, 0, 'Web Server'), rds('db', 5, 0, 'Customer DB', { securityGroupInbound: [PG_ANY], encrypted: false })],
      [wire('users', 'alb'), wire('alb', 'web'), wire('web', 'db')],
    ),
    start: ['users', 'alb', 'web', 'db'],
    beats: [
      { t: 'wire', ids: ['users--alb', 'alb--web', 'web--db'] },
      { t: 'caption', text: 'Ines starts her quarterly security review with the customer database.' },
      { t: 'traffic', expect: 'served' },
      { t: 'camera', shot: 'close', on: 'db' },
      { t: 'callout', on: 'db', title: 'Inbound rule', body: 'tcp 5432 from 0.0.0.0/0', tone: 'bad' },
      { t: 'stat', label: 'Security score', value: 70, tone: 'bad' },
      { t: 'speech', who: 'oncall', text: 'It’s in the private subnet, though. Nothing on the internet can route to it.' },
      { t: 'speech', who: 'security', text: 'Until one route changes. Then that rule lets anyone try passwords. And the disk isn’t encrypted.' },
      { t: 'camera', shot: 'wide' },
      { t: 'clear' },
      { t: 'caption', text: 'Allow port 5432 only from inside the VPC, and encrypt the data at rest.' },
    ],
  },
  wrong: {
    stage: 1,
    why: '“it’s in a private subnet, so the open rule doesn’t matter”',
    change: { set: { db: { securityGroupInbound: [PG_ANY] } } },
    fails: 's1-2',
  },
};

const level70: LevelStory = {
  text: {
    title: 'Gone Viral',
    tagline: 'Assessment: give the feed a database, then keep it fast when traffic doubles.',
    concepts: ['Amazon RDS', 'ElastiCache', 'Read scaling', 'Latency budgets'],
    briefing:
      'The Table’s feed servers have nowhere to store posts, and a celebrity share is about to double the traffic. Give them a database, then hold errors under 1% and latency under 80 ms at 2,200 requests a second.',
    docTips: [
      'Wire every server that needs the data. Behind a load balancer, any request can land on any server.',
      'A read replica adds capacity, but every read still costs a disk query. A cache adds capacity and cuts latency, because most reads never reach the database.',
    ],
    conceptCard: {
      title: 'Choosing the data tier',
      summary:
        'A relational database holds the truth, a replica spreads read load, and a cache absorbs repeated reads in memory. Which one you add depends on whether the problem is capacity, speed, or both.',
      analogy: 'More cashiers shorten the queue. A shelf of ready-made sandwiches shortens the queue and the wait.',
      keyTakeaway: 'Measure first: a capacity problem and a latency problem can need different fixes.',
    },
    iacSnippet: `resource "aws_elasticache_replication_group" "feed" {
  replication_group_id       = "feed-cache"
  description                = "Feed cache for both servers"
  engine                     = "redis"
  node_type                  = "cache.r7g.large"
  num_cache_clusters         = 2
  automatic_failover_enabled = true
  multi_az_enabled           = true
  subnet_group_name          = aws_elasticache_subnet_group.private.name
}`,
  },
  stages: [
    {
      title: 'Persist posts',
      brief: 'The feed servers have nowhere to store posts, and 1,000 requests a second are arriving.',
      goal: 'Add an RDS database and wire both feed servers to it, keeping errors under 1%.',
    },
    {
      title: 'Gone viral',
      brief: '2,200 requests a second. The database tops out at 1,500, and the feed is slowing down.',
      goal: 'Cache feed reads for both servers: errors under 1%, latency under 80 ms.',
    },
  ],
  cutscene: {
    stage: board(
      [users(), alb(), ec2('web1', 1, -1, 'Feed Server A'), ec2('web2', 1, 1, 'Feed Server B'), rds('db', 5, 0, 'Posts DB'), redis('cache', 6, 0, 'Feed Cache')],
      [wire('users', 'alb'), wire('alb', 'web1'), wire('alb', 'web2'), wire('web1', 'db'), wire('web2', 'db'), wire('web1', 'cache'), wire('web2', 'cache')],
    ),
    start: ['users', 'alb', 'web1', 'web2'],
    beats: [
      { t: 'wire', ids: ['users--alb', 'alb--web1', 'alb--web2'] },
      { t: 'caption', text: 'A celebrity chef shares a post from The Table. Then another.' },
      { t: 'speech', who: 'founder', text: 'The new feed servers have nowhere to keep posts. Give them a database, quickly.' },
      { t: 'spawn', ids: ['db'] },
      { t: 'wire', ids: ['web1--db', 'web2--db'] },
      { t: 'traffic', rps: 1000, expect: 'served' },
      { t: 'stat', label: 'Requests / s', value: 2200, tone: 'bad' },
      { t: 'camera', shot: 'close', on: 'db' },
      { t: 'callout', on: 'db', title: 'Posts DB', body: 'Past its limit', tone: 'bad' },
      { t: 'speech', who: 'oncall', text: 'A read replica adds capacity, but every read still waits on disk.' },
      { t: 'spawn', ids: ['cache'] },
      { t: 'speech', who: 'cto', text: 'You know every piece of this. Make the feed fast for both servers, not just one.' },
      { t: 'camera', shot: 'wide' },
    ],
  },
  wrong: {
    stage: 2,
    why: 'a read replica instead of a cache',
    change: { remove: ['cache'], set: { db: { readReplica: true } } },
    fails: 's2-1',
  },
};

export const MODULE_7_STORIES: Record<number, LevelStory> = {
  61: level61,
  62: level62,
  63: level63,
  64: level64,
  65: level65,
  66: level66,
  67: level67,
  68: level68,
  69: level69,
  70: level70,
};
