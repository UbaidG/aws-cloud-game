/**
 * Module 3: Serverless & Containers. After Black Friday, Rio's shop stops paying for idle
 * servers: functions for the quiet jobs, containers for the busy ones, a platform for the side
 * project, and a queue for the bursts. The finale joins the mobile app and the website.
 */

import { block, board, users, wire } from '../build';
import type { BlockConfig } from '../../engine/types';
import type { LevelStory } from '../story';

const ec2 = (id: string, gridX: number, gridZ = 0, name?: string, config?: Partial<BlockConfig>) => block(id, 'ec2', gridX, gridZ, { name, config });
const lambda = (id: string, gridX: number, gridZ = 0, name?: string) => block(id, 'lambda', gridX, gridZ, { name });
const ecs = (id: string, gridX: number, gridZ = 0, name?: string, config?: Partial<BlockConfig>) => block(id, 'ecs', gridX, gridZ, { name, config });

const HTTP_ANY = { protocol: 'tcp', port: 80, source: '0.0.0.0/0' } as const;
const alb = (gridX = -1, gridZ = 0) => block('alb', 'alb', gridX, gridZ, { name: 'Load Balancer' });

const level21: LevelStory = {
  text: {
    title: 'Zero Idle Bill',
    tagline: 'Swap an always-on server for a function that only runs when it’s called.',
    concepts: ['AWS Lambda', 'Serverless', 'Pay-per-use pricing'],
    briefing:
      'The order-status checker runs on an m5.large that costs $110 a month and spends most of its time waiting. Replace it with a Lambda function, which is billed only for the requests it handles and the milliseconds it runs.',
    docTips: [
      'Lambda bills per request and per millisecond of run time, and the free tier covers a million requests a month. A function nobody calls costs nothing.',
    ],
    conceptCard: {
      title: 'Serverless functions',
      summary:
        'A Lambda function is code that AWS runs on demand. It starts when a request or event arrives, scales out by itself, and stops when the work is done. There’s no server to size or patch.',
      analogy: 'Taking a taxi instead of owning a car: you pay for each journey, not for the car sitting in the drive.',
      keyTakeaway: 'For quiet or spiky work, pay per request, not per hour. Jobs that run longer than 15 minutes still need a server or a container.',
    },
    iacSnippet: `resource "aws_lambda_function" "order_status" {
  function_name = "order-status"
  runtime       = "nodejs22.x"
  handler       = "index.handler"
  filename      = "order_status.zip"
  role          = aws_iam_role.lambda_exec.arn
  memory_size   = 256
}`,
  },
  stages: [
    {
      title: 'Stop paying for idle',
      brief: 'A $110-a-month server answers 50 requests a second and waits around the rest of the time.',
      goal: 'Replace the server with a Lambda function, keeping the bill under $20 a month.',
      hint: 'Delete the old server, then place a Lambda function and wire Internet Users to it.',
    },
  ],
  cutscene: {
    stage: board(
      [users(), ec2('old', 0, -1, 'Always-On Server', { instanceType: 'm5.large' }), lambda('fn', 1, 0, 'Order Status')],
      [wire('users', 'old'), wire('users', 'fn')],
    ),
    start: ['users', 'old'],
    beats: [
      { t: 'wire', ids: ['users--old'] },
      { t: 'caption', text: 'January. Black Friday is over, and Tom is reading the bill line by line.' },
      { t: 'traffic', rps: 50, expect: 'served' },
      { t: 'camera', shot: 'close', on: 'old' },
      { t: 'callout', on: 'old', title: 'm5.large', body: 'Busy 4% of the day. Billed for 100%.', tone: 'warn' },
      { t: 'stat', label: 'Server bill / month', value: 110, prefix: '$', tone: 'bad' },
      { t: 'speech', who: 'finance', text: 'We pay for every second of the night, and it spends 96% of them waiting.' },
      { t: 'speech', who: 'oncall', text: 'And I still patch its operating system every month.' },
      { t: 'camera', shot: 'wide' },
      { t: 'spawn', ids: ['fn'], hold: 900 },
      { t: 'camera', shot: 'low', on: 'fn' },
      { t: 'speech', who: 'cto', text: 'A Lambda function runs only when a request arrives. No requests, no bill.' },
      { t: 'clear' },
      { t: 'caption', text: 'Retire the server. Let a function do its job.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'keeping the old server as a backup',
    change: { add: 'old:ec2@0,-1', set: { old: { instanceType: 'm5.large' } }, wire: 'users-old' },
    fails: 's1-3',
  },
};

const level22: LevelStory = {
  text: {
    title: 'API Front Door',
    tagline: 'Give your function a managed front door that turns bots away.',
    concepts: ['Amazon API Gateway', 'AWS Lambda', 'Throttling'],
    briefing:
      'Rio’s mobile app needs an orders API, and the function behind it is ready. Bots are already hammering the address. Put API Gateway in front, so only well-formed, rate-limited requests reach your code.',
    docTips: [
      'API Gateway handles routing, authorisation and throttling (by default 10,000 requests a second per account and Region), then invokes Lambda. REST APIs can also attach AWS WAF rules.',
    ],
    conceptCard: {
      title: 'API Gateway',
      summary:
        'API Gateway is a managed front door for APIs. It accepts HTTPS requests, checks keys or tokens, applies rate limits, and invokes your function only for requests that pass.',
      analogy: 'A receptionist who checks badges and turns away cold callers, so the experts upstairs only see real visitors.',
      keyTakeaway: 'Don’t hand your function to the raw internet. Let the gateway authenticate, throttle and filter first.',
    },
    iacSnippet: `resource "aws_apigatewayv2_api" "orders" {
  name          = "orders-api"
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_integration" "orders" {
  api_id                 = aws_apigatewayv2_api.orders.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.orders.invoke_arn
  payload_format_version = "2.0"
}`,
  },
  stages: [
    {
      title: 'Front door',
      brief: 'The orders function is ready, and bots are already knocking: 2,000 junk requests a second.',
      goal: 'Put API Gateway in front of the function, so bots are filtered before they reach it.',
      hint: 'API Gateway lives in the Edge zone. Wire Internet Users to it, and it to the function.',
    },
  ],
  cutscene: {
    stage: board(
      [users(), block('api', 'apigw', -2, 0, { name: 'Orders API' }), lambda('fn', 4, 0, 'Orders Function')],
      [wire('users', 'api'), wire('api', 'fn')],
    ),
    start: ['users', 'fn'],
    beats: [
      { t: 'caption', text: 'Rio’s mobile app ships on Friday. Dev has written the orders function.' },
      { t: 'camera', shot: 'close', on: 'fn' },
      { t: 'callout', on: 'fn', title: 'Orders Function', body: 'Ready. No way in yet.', tone: 'info' },
      { t: 'speech', who: 'oncall', text: 'I could give it a public function URL and be done by lunch.' },
      { t: 'stat', label: 'Bot requests / s', value: 2000, tone: 'bad' },
      { t: 'speech', who: 'security', text: 'Then every bot on the internet calls your code directly, and we pay for each call.' },
      { t: 'camera', shot: 'wide' },
      { t: 'spawn', ids: ['api'], hold: 900 },
      { t: 'wire', ids: ['users--api', 'api--fn'] },
      { t: 'traffic', rps: 200, botRps: 2000, expect: 'served' },
      { t: 'speech', who: 'cto', text: 'API Gateway checks and throttles every request. Only real orders reach the function.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'exposing the function directly, no gateway',
    change: { remove: ['api'], move: { fn: [1, 0] }, wire: 'users-fn' },
    fails: 's1-2',
  },
};

const level23: LevelStory = {
  text: {
    title: 'Box It Up',
    tagline: 'Package the shop as a container image and let ECS run it.',
    concepts: ['Containers', 'Amazon ECS', 'AWS Fargate'],
    briefing:
      'The shop runs perfectly on Dev’s laptop and breaks on the servers, because they never have quite the same libraries. The team has packaged the app as a container image that runs the same everywhere. Run it as an ECS service behind the load balancer, then make sure the load balancer is the only way in.',
    docTips: [
      'With Fargate, ECS runs your containers without any EC2 instances for you to manage. You pay for the vCPU and memory each task uses while it runs.',
      'Give the tasks a security group that only accepts traffic from the load balancer’s security group. Then the load balancer is the only way in.',
    ],
    conceptCard: {
      title: 'Amazon ECS',
      summary:
        'A container image bundles your code with everything it needs to run. ECS runs a chosen number of copies (tasks) of that image as a service, replaces any that fail, and registers them with the load balancer.',
      analogy: 'A shipping container: pack it once, and every ship, train and lorry can carry it without repacking.',
      keyTakeaway: 'Build the image once and run it anywhere. ECS keeps the right number of copies running.',
    },
    iacSnippet: `resource "aws_ecs_service" "shop" {
  name            = "shop"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.shop.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets = aws_subnet.private[*].id
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.shop.arn
    container_name   = "shop"
    container_port   = 80
  }
}`,
  },
  stages: [
    {
      title: 'Ship the container',
      brief: 'The app is packaged as a container image. Nothing is running it yet.',
      goal: 'Run an ECS service behind the load balancer.',
    },
    {
      title: 'Only through the front door',
      brief: 'The tasks accept port 80 from anywhere, so anyone who finds their addresses can skip the load balancer.',
      goal: 'Allow port 80 on the service only from inside the VPC, keeping the path through the load balancer.',
      hint: 'Select the ECS service and change the port 80 rule’s source from 0.0.0.0/0 to the VPC.',
    },
  ],
  cutscene: {
    stage: board(
      [users(), alb(), ec2('web', 1, 0, 'Web Server'), ecs('svc', 2, 1, 'Shop Service')],
      [wire('users', 'alb'), wire('alb', 'web'), wire('alb', 'svc')],
    ),
    start: ['users', 'alb', 'web'],
    beats: [
      { t: 'wire', ids: ['users--alb', 'alb--web'] },
      { t: 'caption', text: 'Tuesday’s release passed every test on Dev’s laptop.' },
      { t: 'traffic', expect: 'served' },
      { t: 'crash', id: 'web' },
      { t: 'camera', shot: 'close', on: 'web' },
      { t: 'callout', on: 'web', title: 'Deploy failed', body: 'Image library: wrong version', tone: 'bad' },
      { t: 'speech', who: 'oncall', text: 'It works on my machine! The server has an older version of the image library.' },
      { t: 'speech', who: 'cto', text: 'Then ship the machine. Package the app and everything it needs as one container image.' },
      { t: 'remove', ids: ['web'] },
      { t: 'spawn', ids: ['svc'], hold: 900 },
      { t: 'camera', shot: 'orbit', on: 'svc' },
      { t: 'clear' },
      { t: 'caption', text: 'Run the image on ECS, behind the load balancer.' },
    ],
  },
  wrong: {
    stage: 2,
    why: 'leaving the tasks open “because the load balancer is in front anyway”',
    change: { set: { svc: { securityGroupInbound: [HTTP_ANY] } } },
    fails: 's2-1',
  },
};

const level24: LevelStory = {
  text: {
    title: 'More Tasks',
    tagline: 'A container service scales by running more tasks, not by adding services.',
    concepts: ['ECS services and tasks', 'Desired count', 'Service Auto Scaling'],
    briefing:
      'The mobile app has taken off, and the shop now sees 2,400 requests a second. The shop service runs 2 tasks, and each handles about 600. Raise the service’s task count so it keeps up.',
    docTips: [
      'ECS spreads a service’s tasks across Availability Zones, and Service Auto Scaling can change the task count based on CPU or requests per target.',
    ],
    conceptCard: {
      title: 'Scaling containers',
      summary:
        'An ECS service keeps a desired count of identical tasks running. Raise the count and ECS starts more tasks, registers each with the load balancer’s target group, and spreads them across Availability Zones.',
      analogy: 'More cooks in the same kitchen, all working from the same recipe card.',
      keyTakeaway: 'One service per job; scale it with its task count. A second service is for a different job.',
    },
    iacSnippet: `resource "aws_appautoscaling_target" "checkout" {
  service_namespace  = "ecs"
  resource_id        = "service/\${aws_ecs_cluster.main.name}/\${aws_ecs_service.checkout.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  min_capacity       = 2
  max_capacity       = 10
}`,
  },
  stages: [
    {
      title: 'More tasks',
      brief: '2,400 requests a second, and 2 tasks handle about 1,200.',
      goal: 'Raise the shop service’s task count until errors drop below 1%, keeping one service.',
      hint: 'Select the ECS service and raise Running tasks.',
    },
  ],
  cutscene: {
    stage: board(
      [users(), alb(), ecs('svc', 2, 0, 'Shop Service', { desiredCount: 2 })],
      [wire('users', 'alb'), wire('alb', 'svc')],
    ),
    start: ['users', 'alb', 'svc'],
    beats: [
      { t: 'wire', ids: ['users--alb', 'alb--svc'] },
      { t: 'caption', text: 'Rio’s app reaches number one in the shopping charts.' },
      { t: 'stat', label: 'Requests / s', value: 2400, tone: 'warn' },
      { t: 'traffic', rps: 2400, expect: 'served' },
      { t: 'camera', shot: 'close', on: 'svc' },
      { t: 'callout', on: 'svc', title: '2 tasks running', body: 'About 600 requests a second each', tone: 'bad' },
      { t: 'stat', label: 'Failed requests', value: 50, unit: '%', tone: 'bad' },
      { t: 'speech', who: 'founder', text: 'Half of all requests failing, on our best day ever.' },
      { t: 'speech', who: 'oncall', text: 'I’ll copy the service and wire up a second one.' },
      { t: 'speech', who: 'cto', text: 'No need. A service is a number of tasks. Change the number and ECS does the rest.' },
      { t: 'camera', shot: 'wide' },
      { t: 'caption', text: 'Raise the shop service’s task count.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'copying the service instead of adding tasks',
    change: { set: { svc: { desiredCount: 2 } }, add: 'svc2:ecs@2,1', wire: 'alb-svc2' },
    fails: 's1-2',
  },
};

const level25: LevelStory = {
  text: {
    title: 'Kubernetes Captain',
    tagline: 'Run a growing fleet of microservices on a managed Kubernetes cluster.',
    concepts: ['Amazon EKS', 'Kubernetes', 'Private subnets'],
    briefing:
      'The shop has split into a dozen microservices, each with its own deploy script. The team wants Kubernetes, which most of them already know. Run an EKS cluster in the private subnet, reachable only through the load balancer.',
    docTips: [
      'EKS runs the Kubernetes control plane for you across several Availability Zones. You run the worker nodes, or let Fargate or EKS Auto Mode manage them.',
    ],
    conceptCard: {
      title: 'Amazon EKS',
      summary:
        'Kubernetes schedules containers onto a pool of machines, restarts them when they fail and lets services find each other. EKS runs the Kubernetes control plane as a managed service, so you only look after your workloads.',
      analogy: 'A harbour master who decides which ship docks at which berth, so the captains don’t have to argue about it.',
      keyTakeaway: 'Choose EKS when you need Kubernetes itself; ECS is less to run. Either way, keep the cluster private.',
    },
    iacSnippet: `resource "aws_eks_cluster" "shop" {
  name     = "shop"
  role_arn = aws_iam_role.eks_cluster.arn

  vpc_config {
    subnet_ids              = aws_subnet.private[*].id
    endpoint_private_access = true
    endpoint_public_access  = false
  }
}`,
  },
  stages: [
    {
      title: 'Hire a captain',
      brief: 'A dozen microservices need one orchestrator, hidden from the internet.',
      goal: 'Run an EKS cluster in the private subnet, behind the load balancer.',
    },
  ],
  cutscene: {
    stage: board(
      [
        users(),
        alb(),
        ecs('cart', 1, -2, 'Cart'),
        ecs('search', 1, 0, 'Search'),
        ecs('reviews', 1, 2, 'Reviews'),
        block('k8s', 'eks', 3, 0, { name: 'EKS Cluster' }),
      ],
      [wire('users', 'alb'), wire('alb', 'cart'), wire('alb', 'search'), wire('alb', 'reviews'), wire('alb', 'k8s')],
    ),
    start: ['users', 'alb', 'cart', 'search', 'reviews'],
    beats: [
      { t: 'wire', ids: ['users--alb', 'alb--cart', 'alb--search', 'alb--reviews'] },
      { t: 'caption', text: 'Spring. The shop is now a dozen small services, and counting.' },
      { t: 'traffic', expect: 'served' },
      { t: 'camera', shot: 'close', on: 'search' },
      { t: 'callout', on: 'search', title: 'Search', body: 'Deploy script #7 of 12', tone: 'warn' },
      { t: 'speech', who: 'oncall', text: 'Twelve services, twelve deploy scripts, twelve sets of scaling rules. I can’t keep up.' },
      { t: 'speech', who: 'cto', text: 'Most of the new hires already know Kubernetes. Let it schedule the lot.' },
      { t: 'remove', ids: ['cart', 'search', 'reviews'] },
      { t: 'spawn', ids: ['k8s'], hold: 900 },
      { t: 'camera', shot: 'low', on: 'k8s' },
      { t: 'callout', on: 'k8s', title: 'Private subnet', body: 'No route from the internet', tone: 'good' },
      { t: 'caption', text: 'Put the cluster where only the load balancer can reach it.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'a cluster in the public subnet',
    change: { move: { k8s: [1, 0] } },
    fails: 's1-1',
  },
};

const level26: LevelStory = {
  text: {
    title: 'Shared State',
    tagline: 'Give the cluster a private database, then a cache to make it fast.',
    concepts: ['Amazon RDS', 'Amazon ElastiCache', 'Cache-aside'],
    briefing:
      'Pods come and go, and anything they keep on their own disks goes with them. Give the cluster a shared RDS database in the private subnet, then add a Redis cache so product pages load in under 80 ms.',
    docTips: [
      'Pods are replaced all the time, so anything on a pod’s disk can vanish. Keep orders in a managed database, and pass its credentials in from Secrets Manager.',
      'With cache-aside, the app asks Redis first and only queries the database on a miss, then stores the answer in Redis with an expiry time.',
    ],
    conceptCard: {
      title: 'Caching reads',
      summary:
        'A database answers in milliseconds; an in-memory cache such as ElastiCache answers in well under one. The app checks the cache first and only goes to the database on a miss.',
      analogy: 'Keeping today’s bestsellers on the counter instead of fetching them from the stockroom every time.',
      keyTakeaway: 'Stateless compute, a database for the truth, and a cache for whatever is read most often.',
    },
    iacSnippet: `resource "aws_elasticache_replication_group" "cache" {
  replication_group_id = "product-cache"
  description          = "Product page cache"
  engine               = "redis"
  node_type            = "cache.t4g.small"
  num_cache_clusters   = 2
  subnet_group_name    = aws_elasticache_subnet_group.private.name
}`,
  },
  stages: [
    {
      title: 'Persist',
      brief: 'The microservices need somewhere shared, and permanent, to keep orders.',
      goal: 'Wire the cluster to an RDS database in the private subnet.',
    },
    {
      title: 'Speed up',
      brief: 'Product pages take 150 ms. The product team wants them under 80 ms.',
      goal: 'Add a Redis cache beside the database, bringing latency under 80 ms.',
    },
  ],
  cutscene: {
    stage: board(
      [
        users(),
        alb(),
        block('k8s', 'eks', 3, 0, { name: 'EKS Cluster' }),
        block('db', 'rds', 5, 0, { name: 'Orders DB' }),
        block('cache', 'redis', 5, 1, { name: 'Product Cache' }),
      ],
      [wire('users', 'alb'), wire('alb', 'k8s'), wire('k8s', 'db'), wire('k8s', 'cache')],
    ),
    start: ['users', 'alb', 'k8s'],
    beats: [
      { t: 'wire', ids: ['users--alb', 'alb--k8s'] },
      { t: 'caption', text: 'Kubernetes moves pods around all day. That’s its job.' },
      { t: 'traffic', expect: 'served' },
      { t: 'camera', shot: 'close', on: 'k8s' },
      { t: 'callout', on: 'k8s', title: 'Pod rescheduled', body: '37 baskets lost', tone: 'bad' },
      { t: 'speech', who: 'founder', text: 'Customers filled their baskets, then watched them empty.' },
      { t: 'speech', who: 'oncall', text: 'The pods kept baskets on their own disks. When a pod moves, its disk doesn’t.' },
      { t: 'spawn', ids: ['db'] },
      { t: 'wire', ids: ['k8s--db'] },
      { t: 'camera', shot: 'wide' },
      { t: 'stat', label: 'Page load', value: 150, unit: 'ms', tone: 'warn' },
      { t: 'speech', who: 'cto', text: 'A database keeps the data safe. A cache beside it will make it fast.' },
      { t: 'spawn', ids: ['cache'] },
    ],
  },
  wrong: {
    stage: 2,
    why: 'a read replica instead of a cache',
    change: { remove: ['cache'], set: { db: { readReplica: true } } },
    fails: 's2-1',
  },
};

const level27: LevelStory = {
  text: {
    title: 'Just Ship It',
    tagline: 'Hand the servers, scaling and deploys to Elastic Beanstalk.',
    concepts: ['AWS Elastic Beanstalk', 'Platform as a service', 'Managed environments'],
    briefing:
      'Rio wants a recipe blog beside the shop, and nobody has time to build another fleet. Upload the code to Elastic Beanstalk and let it create the servers, load balancer and scaling for you.',
    docTips: [
      'Beanstalk builds ordinary AWS resources (EC2 instances, an Auto Scaling group, a load balancer) and runs them for you. Beanstalk itself is free; you pay for what it creates.',
      'A database created inside a Beanstalk environment is deleted with the environment. Create RDS separately and pass its address to the app in an environment variable.',
    ],
    conceptCard: {
      title: 'Platform as a service',
      summary:
        'With Elastic Beanstalk you upload your code and pick a platform such as Node.js or Python. Beanstalk provisions the infrastructure, handles deployments and watches the app’s health.',
      analogy: 'A serviced flat: you bring your belongings, and someone else sorts the plumbing, the heating and the bins.',
      keyTakeaway: 'When the app is ordinary, let a platform run the infrastructure and spend your time on the app.',
    },
    iacSnippet: `data "aws_elastic_beanstalk_solution_stack" "node" {
  most_recent = true
  name_regex  = "^64bit Amazon Linux 2023 (.*) running Node.js 22$"
}

resource "aws_elastic_beanstalk_environment" "blog" {
  name                = "recipe-blog"
  application         = aws_elastic_beanstalk_application.blog.name
  solution_stack_name = data.aws_elastic_beanstalk_solution_stack.node.name
}`,
  },
  stages: [
    {
      title: 'Just ship it',
      brief: 'You have working code and no time to manage servers.',
      goal: 'Deploy the app with Elastic Beanstalk.',
    },
    {
      title: 'Data that outlives the app',
      brief: 'The blog needs somewhere to keep recipes, and Beanstalk environments get rebuilt.',
      goal: 'Give the app its own RDS database in the private subnet.',
    },
  ],
  cutscene: {
    stage: board([users(), block('app', 'beanstalk', 1, 0, { name: 'Recipe Blog' })], [wire('users', 'app')]),
    start: ['users'],
    beats: [
      { t: 'caption', text: 'Rio has a new idea: a recipe blog to bring shoppers in.' },
      { t: 'speech', who: 'founder', text: 'It’s a small Node app. Can it be live by Friday?' },
      { t: 'speech', who: 'oncall', text: 'Servers, a load balancer, scaling rules, patching, deploys… that’s a week before the blog.' },
      { t: 'stat', label: 'Days of setup', value: 5, tone: 'bad' },
      { t: 'speech', who: 'cto', text: 'Or hand all of that to Elastic Beanstalk. We upload the code; it builds the rest.' },
      { t: 'spawn', ids: ['app'], hold: 900 },
      { t: 'camera', shot: 'close', on: 'app' },
      { t: 'callout', on: 'app', title: 'Node.js platform', body: 'Servers, scaling and deploys: managed', tone: 'good' },
      { t: 'camera', shot: 'wide' },
      { t: 'clear' },
      { t: 'caption', text: 'Deploy the blog and connect it to your users.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'building the server by hand again',
    change: { remove: ['app'], add: 'web:ec2@1,0', wire: 'users-web' },
    fails: 's1-1',
  },
};

const level28: LevelStory = {
  text: {
    title: 'Private Uploads',
    tagline: 'Store readers’ photos in S3 without leaving the bucket open to the world.',
    concepts: ['Amazon S3', 'Block Public Access', 'IAM roles'],
    briefing:
      'The blog lets readers upload photos of their cooking, and the media bucket was made public to get it working. Connect the app to the bucket so it reads and writes through its own IAM role, then switch Block Public Access back on.',
    docTips: [
      'Block Public Access overrides any bucket policy or ACL that would make objects public. It’s on by default for new buckets: leave it on, and give your app access through its IAM role.',
    ],
    conceptCard: {
      title: 'Block Public Access',
      summary:
        'S3 buckets are private unless something makes them public. Block Public Access is a switch, per bucket or per account, that overrides any public policy or ACL. Your app keeps its access through its IAM role.',
      analogy: 'A deadlock on the stockroom door: staff use their keys, and no sign on the door can let the public in.',
      keyTakeaway: 'The app gets access through its role; the world gets none. Serve public files through CloudFront, not an open bucket.',
    },
    iacSnippet: `resource "aws_s3_bucket_public_access_block" "media" {
  bucket                  = aws_s3_bucket.media.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}`,
  },
  stages: [
    {
      title: 'Uploads',
      brief: 'Readers upload photos, and the media bucket is open to the whole internet.',
      goal: 'Connect the app to the bucket and switch on Block Public Access.',
    },
  ],
  cutscene: {
    stage: board(
      [
        users(),
        block('app', 'beanstalk', 1, 0, { name: 'Recipe Blog' }),
        block('media', 's3', 5, 0, { name: 'Media Bucket', config: { blockPublicAccess: false } }),
      ],
      [wire('users', 'app')],
    ),
    start: ['users', 'app', 'media'],
    beats: [
      { t: 'wire', ids: ['users--app'] },
      { t: 'caption', text: 'The blog takes off. Readers upload 3,000 photos in a week.' },
      { t: 'traffic', expect: 'served' },
      { t: 'camera', shot: 'close', on: 'media' },
      { t: 'callout', on: 'media', title: 'Public bucket', body: 'Anyone can list and download', tone: 'bad' },
      { t: 'speech', who: 'security', text: 'A researcher just sent us a list of every file in it, including a passport scan.' },
      { t: 'stat', label: 'Files exposed', value: 3000, tone: 'bad' },
      { t: 'speech', who: 'oncall', text: 'I opened it up because the app couldn’t save photos.' },
      { t: 'camera', shot: 'wide' },
      { t: 'speech', who: 'cto', text: 'The app needs a role and a connection, not a public bucket.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'leaving the bucket public so photos still display',
    change: { set: { media: { blockPublicAccess: false } } },
    fails: 's1-2',
  },
};

const level29: LevelStory = {
  text: {
    title: 'Queue It Up',
    tagline: 'Let a queue soak up an order spike, and a function work through it.',
    concepts: ['Amazon SQS', 'Decoupling', 'Event-driven processing'],
    briefing:
      'A limited-edition drop brings 6,000 orders a second, twice what the order function can process at once. Put an SQS queue between the API and a Lambda worker, so every order is accepted straight away and processed as fast as the worker can go.',
    docTips: [
      'Lambda polls the queue for you and processes messages in batches. Add a dead-letter queue, so an order that keeps failing is set aside instead of retried for ever.',
    ],
    conceptCard: {
      title: 'Queues',
      summary:
        'A queue separates the part that accepts work from the part that does it. The API drops each order into SQS in milliseconds; workers pull messages at their own pace and delete each one when it’s done.',
      analogy: 'The ticket rail in a busy kitchen: orders are pinned up as fast as they arrive, and each cook takes the next one when free.',
      keyTakeaway: 'When bursts outrun your workers, buffer them. A queue turns a spike into a backlog instead of a failure.',
    },
    iacSnippet: `resource "aws_lambda_event_source_mapping" "orders" {
  event_source_arn = aws_sqs_queue.orders.arn
  function_name    = aws_lambda_function.worker.arn
  batch_size       = 10
}`,
  },
  stages: [
    {
      title: 'Absorb the burst',
      brief: '6,000 orders a second, twice what the order function can process at once.',
      goal: 'Queue the orders in SQS and let a Lambda worker drain the queue.',
      hint: 'The worker pulls orders from the queue, so wire the queue to the function, not the API.',
    },
  ],
  cutscene: {
    stage: board(
      [
        users(),
        block('api', 'apigw', -2, 0, { name: 'Orders API' }),
        lambda('fn', 4, -1, 'Order Function'),
        block('q', 'sqs', 4, 0, { name: 'Order Queue' }),
      ],
      [wire('users', 'api'), wire('api', 'fn')],
    ),
    start: ['users', 'api', 'fn'],
    beats: [
      { t: 'wire', ids: ['users--api', 'api--fn'] },
      { t: 'caption', text: '10:00 a.m. The limited-edition drop goes live.' },
      { t: 'stat', label: 'Orders / s', value: 6000, tone: 'warn' },
      { t: 'traffic', rps: 6000, expect: 'served' },
      { t: 'camera', shot: 'close', on: 'fn' },
      { t: 'callout', on: 'fn', title: 'At its limit', body: '3,000 orders at once', tone: 'bad' },
      { t: 'stat', label: 'Orders rejected', value: 50, unit: '%', tone: 'bad' },
      { t: 'speech', who: 'founder', text: 'Half the people who tried to buy got an error. They won’t try twice.' },
      { t: 'speech', who: 'cto', text: 'They don’t need the order processed this second. They need it accepted.' },
      { t: 'remove', ids: ['fn'] },
      { t: 'spawn', ids: ['q'], hold: 900 },
      { t: 'camera', shot: 'low', on: 'q' },
      { t: 'caption', text: 'Put a queue in the middle, and let a worker drain it.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'calling the worker directly and hoping it keeps up',
    change: { remove: ['q'], wire: 'api-worker' },
    fails: 's1-2',
  },
};

const level30: LevelStory = {
  text: {
    title: 'Two Front Doors',
    tagline: 'Assessment: a serverless mobile API and a container web tier, sharing one table.',
    concepts: ['API Gateway and Lambda', 'Amazon ECS', 'Amazon DynamoDB', 'Choosing compute'],
    briefing:
      'Rio wants one list of orders for both the mobile app and the website. Build a serverless API for the app, then a container web tier that reads and writes the same DynamoDB table, with errors under 1% at 4,000 requests a second.',
    docTips: [
      'DynamoDB on-demand mode bills per request and scales with traffic, so a serverless API never pays for idle database capacity.',
      'Give the API and the web tier separate IAM roles that can both use the same table: one source of truth, least privilege for each.',
    ],
    conceptCard: {
      title: 'Choosing compute',
      summary:
        'Lambda suits short, spiky, event-driven work; containers suit steady traffic and long-running processes. Both can share a managed database such as DynamoDB, which has no servers of its own to scale.',
      analogy: 'A food truck for the lunchtime rush and a restaurant for the regulars, both cooking from the same pantry.',
      keyTakeaway: 'Pick the compute that fits each workload, and keep one source of truth for the data.',
    },
    iacSnippet: `resource "aws_dynamodb_table" "orders" {
  name         = "orders"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "orderId"

  attribute {
    name = "orderId"
    type = "S"
  }
}`,
  },
  stages: [
    {
      title: 'Serverless API',
      brief: 'The mobile app needs an orders API, without a single server to manage.',
      goal: 'Build API Gateway → Lambda → DynamoDB.',
    },
    {
      title: 'Container web tier',
      brief: 'The website is moving over too: 4,000 requests a second in total.',
      goal: 'Add a load balancer and an ECS service that use the same table, with errors under 1%.',
    },
  ],
  cutscene: {
    stage: board(
      [
        users(),
        block('api', 'apigw', -2, -1, { name: 'Orders API' }),
        lambda('fn', 4, -1, 'Orders Function'),
        block('table', 'dynamodb', 6, -1, { name: 'Orders Table' }),
        alb(-1, 1),
        ecs('svc', 3, 1, 'Web Service'),
      ],
      [wire('users', 'api'), wire('api', 'fn'), wire('fn', 'table'), wire('users', 'alb'), wire('alb', 'svc'), wire('svc', 'table')],
    ),
    start: ['users'],
    beats: [
      { t: 'caption', text: 'Module finale. Rio has a mobile app, a website and one big wish.' },
      { t: 'speech', who: 'founder', text: 'One list of orders. Right now the app and the site each keep their own, and they never agree.' },
      { t: 'spawn', ids: ['api', 'fn', 'table'] },
      { t: 'wire', ids: ['users--api', 'api--fn', 'fn--table'] },
      { t: 'traffic', rps: 1000, expect: 'served' },
      { t: 'camera', shot: 'close', on: 'table' },
      { t: 'speech', who: 'cto', text: 'Lambda for the app’s API, containers for the steady web traffic, and one table for both.' },
      { t: 'spawn', ids: ['alb', 'svc'] },
      { t: 'camera', shot: 'top' },
      { t: 'stat', label: 'Combined load', value: 4000, unit: '/s', tone: 'warn' },
      { t: 'speech', who: 'oncall', text: 'You’ve built every piece of this already. This time they share the data.' },
    ],
  },
  wrong: {
    stage: 2,
    why: 'containers keeping orders on their own disks',
    change: { unwire: 'svc-table' },
    fails: 's2-1',
  },
};

export const MODULE_3_STORIES: Record<number, LevelStory> = {
  21: level21,
  22: level22,
  23: level23,
  24: level24,
  25: level25,
  26: level26,
  27: level27,
  28: level28,
  29: level29,
  30: level30,
};
