/**
 * Module 6: Storage. The supermarket deal brings exports, uploads, product videos and auditors.
 * The team learns which data belongs on a disk, in a shared folder, or in a bucket, and gets
 * the shop’s storage ready for launch day.
 */

import { block, board, users, wire } from '../build';
import type { BlockConfig } from '../../engine/types';
import type { LevelStory } from '../story';

const ec2 = (id: string, gridX: number, gridZ = 0, name?: string) => block(id, 'ec2', gridX, gridZ, { name });
const ebs = (id: string, gridX: number, gridZ = 0, name?: string, config?: Partial<BlockConfig>) => block(id, 'ebs', gridX, gridZ, { name, config });
const efs = (id: string, gridX: number, gridZ = 0, name = 'Shared Files') => block(id, 'efs', gridX, gridZ, { name });
const s3 = (id: string, gridX: number, gridZ = 0, name?: string, config?: Partial<BlockConfig>) => block(id, 's3', gridX, gridZ, { name, config });
const alb = (gridX = -1, gridZ = 0) => block('alb', 'alb', gridX, gridZ, { name: 'Load Balancer' });
const cdn = (gridX: number, gridZ: number) => block('cdn', 'cloudfront', gridX, gridZ, { name: 'CloudFront' });

const level51: LevelStory = {
  text: {
    title: 'A Disk That Stays',
    tagline: 'Keep the server’s data on a volume that outlives the machine.',
    concepts: ['Amazon EBS', 'Instance store', 'Block storage'],
    briefing:
      'Dev stopped the web server to resize it, and a month of order exports on its local disk vanished. Attach an EBS volume so the data survives the next stop.',
    docTips: [
      'Instance store disks belong to the physical host and are wiped when the instance stops or terminates. An EBS volume is network storage that keeps its data until you delete it.',
      'gp3 is the default general-purpose EBS type: 3,000 IOPS and 125 MB/s included, whatever the size.',
    ],
    conceptCard: {
      title: 'EBS volumes',
      summary:
        'An EBS volume is a network-attached disk for one EC2 instance in the same Availability Zone. It persists independently of the instance and can be snapshotted, resized and reattached.',
      analogy: 'An external hard drive rather than the laptop’s scratch space: unplug the laptop, and the drive still has your files.',
      keyTakeaway: 'Anything that must outlive the server goes on an EBS volume, never on instance store.',
    },
    iacSnippet: `resource "aws_ebs_volume" "data" {
  availability_zone = aws_instance.web.availability_zone
  size              = 50
  type              = "gp3"
  encrypted         = true
}

resource "aws_volume_attachment" "data" {
  device_name = "/dev/sdf"
  volume_id   = aws_ebs_volume.data.id
  instance_id = aws_instance.web.id
}`,
  },
  stages: [
    {
      title: 'A disk that stays',
      brief: 'The server needs a disk that survives being stopped, resized or replaced.',
      goal: 'Attach an EBS volume to the web server.',
      hint: 'Place an EBS volume next to the server and wire the two together.',
    },
  ],
  cutscene: {
    stage: board([users(), ec2('web', 0, 0, 'Web Server'), ebs('disk', 1, 0, 'Data Volume')], [wire('users', 'web'), wire('web', 'disk')]),
    start: ['users', 'web'],
    beats: [
      { t: 'wire', ids: ['users--web'] },
      { t: 'caption', text: 'The supermarket orders arrive. Dev stops the web server to give it more memory.' },
      { t: 'camera', shot: 'close', on: 'web' },
      { t: 'callout', on: 'web', title: 'Instance store', body: 'Wiped when the server stopped', tone: 'bad' },
      { t: 'stat', label: 'Order exports lost', value: 212, tone: 'bad' },
      { t: 'speech', who: 'founder', text: 'Those were this month’s invoices for the supermarket. Where did they go?' },
      { t: 'speech', who: 'oncall', text: 'They were on the local disk. That disk belongs to the host machine, not to us.' },
      { t: 'spawn', ids: ['disk'], hold: 900 },
      { t: 'camera', shot: 'low', on: 'disk' },
      { t: 'speech', who: 'cto', text: 'Anything that must outlive the server goes on an EBS volume. It stays when the server stops.' },
      { t: 'clear' },
      { t: 'caption', text: 'Attach an EBS volume to the web server.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'using an S3 bucket as the server’s disk',
    change: { remove: ['disk'], add: 'disk:s3@5,0', wire: 'web-disk' },
    fails: 's1-1',
  },
};

const level52: LevelStory = {
  text: {
    title: 'One Disk Each',
    tagline: 'Two servers writing to one disk is how files get corrupted.',
    concepts: ['EBS attachment', 'Block storage limits'],
    briefing:
      'To share the order files, one EBS volume was attached to both servers, and the files are corrupting. Detach it from Server B and give Server B a volume of its own.',
    docTips: [
      'An EBS volume attaches to one instance. Multi-Attach exists only for io1/io2 volumes, within one zone, and needs a cluster-aware file system; ext4 or XFS will corrupt.',
    ],
    conceptCard: {
      title: 'Block storage is single-writer',
      summary:
        'An ordinary file system assumes it is the only one writing to its disk. Two servers writing the same EBS volume overwrite each other’s changes and corrupt it.',
      analogy: 'Two people editing the same paper ledger at once, each rubbing out what the other wrote.',
      keyTakeaway: 'One EBS volume per server. For files many servers share, use a shared file system.',
    },
    iacSnippet: `resource "aws_ebs_volume" "data" {
  for_each          = aws_instance.web
  availability_zone = each.value.availability_zone
  size              = 50
  type              = "gp3"
}

resource "aws_volume_attachment" "data" {
  for_each    = aws_instance.web
  device_name = "/dev/sdf"
  volume_id   = aws_ebs_volume.data[each.key].id
  instance_id = each.value.id
}`,
  },
  stages: [
    {
      title: 'One disk each',
      brief: 'One EBS volume is plugged into two servers, and the order files are corrupting.',
      goal: 'Give each server its own EBS volume.',
      hint: 'Delete the wire from Server B to the shared volume, then give Server B a new volume.',
    },
  ],
  cutscene: {
    stage: board(
      [users(), ec2('web1', 0, -1, 'Server A'), ec2('web2', 0, 1, 'Server B'), ebs('disk', 1, 0, 'Data Volume'), ebs('disk2', 1, 1, 'Volume B')],
      [wire('users', 'web1'), wire('users', 'web2'), wire('web1', 'disk'), wire('web2', 'disk'), wire('web2', 'disk2')],
    ),
    start: ['users', 'web1', 'web2', 'disk'],
    beats: [
      { t: 'wire', ids: ['users--web1', 'users--web2', 'web1--disk', 'web2--disk'] },
      { t: 'caption', text: 'Both servers needed the order files, so Dev attached the same volume to both.' },
      { t: 'traffic', expect: 'served', hold: 3000 },
      { t: 'camera', shot: 'close', on: 'disk' },
      { t: 'callout', on: 'disk', title: 'Mounted twice', body: 'Two servers writing one file system', tone: 'bad' },
      { t: 'stat', label: 'Corrupted order files', value: 37, tone: 'bad' },
      { t: 'speech', who: 'cto', text: 'A normal file system assumes it’s the only writer. Two of them overwrite each other.' },
      { t: 'spawn', ids: ['disk2'], hold: 900 },
      { t: 'camera', shot: 'orbit', on: 'disk2' },
      { t: 'speech', who: 'oncall', text: 'One volume each, then. Shared files are a job for a different service.' },
      { t: 'clear' },
      { t: 'caption', text: 'Give each server its own EBS volume.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'keeping the shared volume plugged into both servers',
    change: { wire: 'web2-disk' },
    fails: 'link.ebs_multi_attach',
  },
};

const level53: LevelStory = {
  text: {
    title: 'Bottomless Bucket',
    tagline: 'Photo uploads would fill any disk. A bucket never fills.',
    concepts: ['Amazon S3', 'Object storage', 'Durability'],
    briefing:
      'Customers can now upload photos of their orders, and the server’s disk is nearly full. Store the uploads in an S3 bucket, reached through the web server.',
    docTips: [
      'S3 stores objects (a file plus its metadata) under a key, with no limit on the total. It is designed for 99.999999999% durability by keeping copies across several zones.',
    ],
    conceptCard: {
      title: 'Object storage',
      summary:
        'S3 stores whole files as objects in buckets, read and written over HTTPS. You pay for what you store, it never fills up, and every Region keeps copies across Availability Zones.',
      analogy: 'A cloakroom with infinite pegs: hand in a coat, get a ticket, and collect it whenever you like.',
      keyTakeaway: 'User uploads, images and backups belong in S3, not on a server’s disk.',
    },
    iacSnippet: `resource "aws_s3_bucket" "uploads" {
  bucket = "rios-shop-uploads"
}

resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket                  = aws_s3_bucket.uploads.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}`,
  },
  stages: [
    {
      title: 'Bottomless bucket',
      brief: 'Photo uploads would fill any disk.',
      goal: 'Store uploads in an S3 bucket, wired to the web server.',
    },
  ],
  cutscene: {
    stage: board([users(), ec2('web', 0, 0, 'Web Server'), s3('media', 5, 0, 'Uploads Bucket')], [wire('users', 'web'), wire('web', 'media')]),
    start: ['users', 'web'],
    beats: [
      { t: 'wire', ids: ['users--web'] },
      { t: 'caption', text: 'Rio adds a feature: customers can post photos of what they ordered.' },
      { t: 'traffic', expect: 'served', hold: 3000 },
      { t: 'camera', shot: 'close', on: 'web' },
      { t: 'stat', label: 'Disk used', value: 96, unit: '%', tone: 'bad' },
      { t: 'callout', on: 'web', title: 'Uploads', body: '40 GB this week, and growing', tone: 'warn' },
      { t: 'speech', who: 'oncall', text: 'I’ll attach a bigger disk. And a bigger one next month, I suppose.' },
      { t: 'speech', who: 'cto', text: 'Photos aren’t working files. Put them in S3: you pay per gigabyte, and it never fills up.' },
      { t: 'spawn', ids: ['media'], hold: 900 },
      { t: 'camera', shot: 'low', on: 'media' },
      { t: 'clear' },
      { t: 'caption', text: 'Store the uploads in an S3 bucket.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'a bigger disk instead of a bucket',
    change: { remove: ['media'], add: 'media:ebs@1,0', wire: 'web-media' },
    fails: 's1-1',
  },
};

const level54: LevelStory = {
  text: {
    title: 'Shared Folder',
    tagline: 'Two servers, one folder, and every file visible to both.',
    concepts: ['Amazon EFS', 'Shared file systems', 'NFS'],
    briefing:
      'Staff upload product images through the shop’s admin page, which saves them to a folder on whichever server handled the request. Mount one EFS file system on both servers so both see every file.',
    docTips: [
      'EFS is a managed NFS file system. It grows and shrinks automatically, and you mount it through a mount target in each Availability Zone. If you can change the code, S3 is usually cheaper for images.',
    ],
    conceptCard: {
      title: 'Elastic File System',
      summary:
        'EFS is a file system that many Linux servers mount at once, across Availability Zones. Every server sees the same folders, and a file written by one is instantly there for the rest.',
      analogy: 'A shared network drive in an office: everyone saves to the same folder, and everyone sees the latest version.',
      keyTakeaway: 'EBS is one server’s disk. EFS is a folder every server shares.',
    },
    iacSnippet: `resource "aws_efs_file_system" "shared" {
  encrypted = true
}

resource "aws_efs_mount_target" "a" {
  file_system_id  = aws_efs_file_system.shared.id
  subnet_id       = aws_subnet.private_a.id
  security_groups = [aws_security_group.efs.id]
}`,
  },
  stages: [
    {
      title: 'Shared folder',
      brief: 'Both servers need to read and write the same files.',
      goal: 'Mount one EFS file system on both servers.',
    },
  ],
  cutscene: {
    stage: board(
      [users(), alb(), ec2('web1', 1, -1, 'Server A'), ec2('web2', 1, 1, 'Server B'), efs('share', 4, 0)],
      [wire('users', 'alb'), wire('alb', 'web1'), wire('alb', 'web2'), wire('web1', 'share'), wire('web2', 'share')],
    ),
    start: ['users', 'alb', 'web1', 'web2'],
    beats: [
      { t: 'wire', ids: ['users--alb', 'alb--web1', 'alb--web2'] },
      { t: 'caption', text: 'Rio’s team uploads the new spring range through the admin page.' },
      { t: 'traffic', expect: 'served', hold: 3000 },
      { t: 'camera', shot: 'close', on: 'web2' },
      { t: 'callout', on: 'web2', title: '404 Not Found', body: '/images/spring-range.jpg', tone: 'bad' },
      { t: 'speech', who: 'founder', text: 'Half the customers see the new range. The other half see broken pictures.' },
      { t: 'speech', who: 'oncall', text: 'The upload landed on Server A’s disk. Server B has never heard of it.' },
      { t: 'spawn', ids: ['share'], hold: 900 },
      { t: 'camera', shot: 'orbit', on: 'share' },
      { t: 'speech', who: 'cto', text: 'EFS is one folder over the network. Mount it on both, and both see every file.' },
      { t: 'clear' },
      { t: 'caption', text: 'Mount one EFS file system on both servers.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'one EBS volume shared between both servers',
    change: { remove: ['share'], add: 'share:ebs@2,0', wire: 'web1-share web2-share' },
    fails: 's1-1',
  },
};

const level55: LevelStory = {
  text: {
    title: 'Same Files, More Servers',
    tagline: 'A new server is only useful if it sees the same files as the old one.',
    concepts: ['Horizontal scaling', 'Amazon EFS', 'Stateless servers'],
    briefing:
      'A cookery blog has linked to the shop: 500 requests a second, and one server handles 300. Add a second server behind the load balancer, and mount the shared files on it before it takes traffic.',
    docTips: [
      'Put the EFS mount in the launch template’s user data (amazon-efs-utils with an fstab entry), so every new server mounts the share before it serves a request.',
    ],
    conceptCard: {
      title: 'Scaling with shared state',
      summary:
        'Servers can scale out only if any of them can answer any request. Keeping files on shared storage, not on one machine, means a new server is useful the moment it starts.',
      analogy: 'A new cashier is only useful if their till reads the same price list as everyone else’s.',
      keyTakeaway: 'Mount shared storage on every server, automatically, before it takes traffic.',
    },
    iacSnippet: `resource "aws_launch_template" "web" {
  name_prefix   = "web-"
  image_id      = data.aws_ami.al2023.id
  instance_type = "t3.micro"
  user_data = base64encode(<<-EOT
    #!/bin/bash
    dnf install -y amazon-efs-utils
    mkdir -p /srv/files
    echo "\${aws_efs_file_system.shared.id}:/ /srv/files efs _netdev,tls 0 0" >> /etc/fstab
    mount -a
  EOT
  )
}`,
  },
  stages: [
    {
      title: 'Same files, more servers',
      brief: '500 requests a second, and the new server must see the same files.',
      goal: 'Add a second server behind the load balancer that mounts the same EFS, with errors under 1%.',
    },
  ],
  cutscene: {
    stage: board(
      [users(), alb(), ec2('web1', 1, -1, 'Server A'), efs('share', 4, 0), ec2('web2', 1, 1, 'Server B')],
      [wire('users', 'alb'), wire('alb', 'web1'), wire('web1', 'share'), wire('alb', 'web2'), wire('web2', 'share')],
    ),
    start: ['users', 'alb', 'web1', 'share'],
    beats: [
      { t: 'wire', ids: ['users--alb', 'alb--web1', 'web1--share'] },
      { t: 'caption', text: 'A cookery blog links to Rio’s spring range. 500 requests a second, one server.' },
      { t: 'traffic', rps: 500, expect: 'served' },
      { t: 'camera', shot: 'close', on: 'web1' },
      { t: 'stat', label: 'Errors', value: 40, unit: '%', tone: 'bad' },
      { t: 'speech', who: 'oncall', text: 'Last time I added a server, it came up with an empty images folder.' },
      { t: 'spawn', ids: ['web2'], hold: 900 },
      { t: 'camera', shot: 'orbit', on: 'web2' },
      { t: 'speech', who: 'cto', text: 'Then mount the shared files on it before it takes a single request.' },
      { t: 'clear' },
      { t: 'caption', text: 'Add a second server that mounts the same EFS.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'a second server without the shared files',
    change: { unwire: 'web2-share' },
    fails: 's1-2',
  },
};

const level56: LevelStory = {
  text: {
    title: 'Disk and Backup',
    tagline: 'A fast disk for today, and a copy somewhere else for the day it dies.',
    concepts: ['Block vs object storage', 'Backups', 'Amazon S3'],
    briefing:
      'Everything the shop owns lives on one server. Give it an EBS volume for its working data, and back it up to an S3 bucket, off the server entirely.',
    docTips: [
      'A backup on the same machine dies with the machine. EBS snapshots are stored in S3 behind the scenes, and AWS Backup can schedule and retain them for you.',
    ],
    conceptCard: {
      title: 'Block and object storage',
      summary:
        'Block storage (EBS) is a fast disk one server reads and writes constantly. Object storage (S3) holds whole files durably and cheaply. A sound setup uses both: EBS to work, S3 to keep.',
      analogy: 'Your desk and the archive. You work at the desk; copies go to the archive across town in case the office floods.',
      keyTakeaway: 'Work on EBS, keep copies in S3. A backup must not share the server’s fate.',
    },
    iacSnippet: `resource "aws_s3_bucket" "backups" {
  bucket = "rios-shop-backups"
}

resource "aws_s3_bucket_versioning" "backups" {
  bucket = aws_s3_bucket.backups.id
  versioning_configuration {
    status = "Enabled"
  }
}`,
  },
  stages: [
    {
      title: 'Disk and backup',
      brief: 'The server needs a fast disk for its data and a backup that lives somewhere else.',
      goal: 'Attach an EBS volume and back the server up to an S3 bucket.',
    },
  ],
  cutscene: {
    stage: board(
      [users(), ec2('web', 0, 0, 'Web Server'), ebs('boot', 1, 0, 'Data Volume'), s3('backup', 5, 0, 'Backups')],
      [wire('users', 'web'), wire('web', 'boot'), wire('web', 'backup')],
    ),
    start: ['users', 'web'],
    beats: [
      { t: 'wire', ids: ['users--web'] },
      { t: 'caption', text: 'A rival shop lost a year of orders when its only disk failed. Rio reads the story twice.' },
      { t: 'speech', who: 'founder', text: 'If our server died tonight, what would we have left?' },
      { t: 'camera', shot: 'close', on: 'web' },
      { t: 'callout', on: 'web', title: 'Copies of the shop’s data', body: 'One, on this server', tone: 'warn' },
      { t: 'speech', who: 'oncall', text: 'Honestly? The logo. It’s on my laptop.' },
      { t: 'spawn', ids: ['boot', 'backup'], hold: 900 },
      { t: 'camera', shot: 'top' },
      { t: 'speech', who: 'cto', text: 'A fast disk for today’s work, and a copy in S3 for the day that disk dies.' },
      { t: 'clear' },
      { t: 'caption', text: 'Attach an EBS volume, and back the server up to S3.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'backing up to a second disk on the same server',
    change: { remove: ['backup'], add: 'backup:ebs@2,0', wire: 'web-backup' },
    fails: 's1-2',
  },
};

const level57: LevelStory = {
  text: {
    title: 'Videos at the Edge',
    tagline: 'Stop streaming video through your web server.',
    concepts: ['Amazon CloudFront', 'Amazon S3', 'Origin Access Control'],
    briefing:
      'Rio’s how-to videos have taken off overseas, and every download passes through the one web server. Serve the videos from the S3 bucket through CloudFront instead.',
    docTips: [
      'Keep the bucket private and let CloudFront read it with Origin Access Control. Transfer from S3 to CloudFront is free; you pay CloudFront’s delivery rate instead.',
    ],
    conceptCard: {
      title: 'CloudFront in front of S3',
      summary:
        'CloudFront fetches each video from the bucket once, caches it at edge locations around the world, and serves later viewers from the nearest one. The web server never touches it.',
      analogy: 'Stocking corner shops with the bestseller instead of making everyone travel to the warehouse.',
      keyTakeaway: 'Big static files go S3 → CloudFront → viewer, skipping your servers.',
    },
    iacSnippet: `resource "aws_cloudfront_origin_access_control" "media" {
  name                              = "video-bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "videos" {
  enabled = true
  origin {
    origin_id                = "videos"
    domain_name              = aws_s3_bucket.media.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.media.id
  }
  # default_cache_behavior, restrictions, viewer_certificate ...
}`,
  },
  stages: [
    {
      title: 'Videos at the edge',
      brief: 'Every video download goes through your one web server.',
      goal: 'Serve the videos from S3 through CloudFront.',
      hint: 'Place CloudFront in the Edge zone, then wire Users → CloudFront → Video Bucket.',
    },
  ],
  cutscene: {
    stage: board(
      [users(), ec2('web', 0, 0, 'Web Server'), s3('media', 5, 0, 'Video Bucket'), cdn(-3, 1)],
      [wire('users', 'web'), wire('web', 'media'), wire('users', 'cdn'), wire('cdn', 'media')],
    ),
    start: ['users', 'web', 'media'],
    beats: [
      { t: 'wire', ids: ['users--web', 'web--media'] },
      { t: 'caption', text: 'Rio’s how-to videos take off overseas.' },
      { t: 'traffic', rps: 2000, expect: 'served' },
      { t: 'camera', shot: 'close', on: 'web' },
      { t: 'callout', on: 'web', title: 'CPU 100%', body: 'Every video passes through this server', tone: 'bad' },
      { t: 'stat', label: 'Video served this month', value: 14, unit: ' TB', tone: 'warn' },
      { t: 'speech', who: 'finance', text: 'Data transfer is now the biggest line on our bill. Bigger than the servers.' },
      { t: 'spawn', ids: ['cdn'], hold: 900 },
      { t: 'camera', shot: 'low', on: 'cdn' },
      { t: 'speech', who: 'cto', text: 'CloudFront fetches each video from S3 once, then serves it from a city near the viewer.' },
      { t: 'clear' },
      { t: 'caption', text: 'Serve the videos from S3 through CloudFront.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'a public bucket linked straight to the users',
    change: { remove: ['cdn'], wire: 'users-media', set: { media: { blockPublicAccess: false } } },
    fails: 's1-1',
  },
};

const level58: LevelStory = {
  text: {
    title: 'Lock It Up',
    tagline: 'Encrypt customer records at rest, on the disk and in the bucket.',
    concepts: ['Encryption at rest', 'AWS KMS', 'Customer managed keys'],
    briefing:
      'The supermarket’s auditors found customer records stored unencrypted on the data volume and in an old bucket. Encrypt both with a KMS key, and attach the key to both.',
    docTips: [
      'S3 has encrypted new objects by default since January 2023, but older objects stay as they were. EBS volumes are unencrypted unless you turn on encryption by default for the account, and an existing volume can’t be encrypted in place: snapshot it, copy the snapshot encrypted, and restore.',
    ],
    conceptCard: {
      title: 'Encryption at rest with KMS',
      summary:
        'KMS keeps the keys that encrypt your disks and buckets. A customer managed key lets you control who may use it, rotate it automatically, and see every use of it in CloudTrail.',
      analogy: 'A safe for the filing cabinet’s key. Steal the cabinet and you still can’t read the files.',
      keyTakeaway: 'Encrypt every store of customer data, and control the key separately from the data.',
    },
    iacSnippet: `resource "aws_kms_key" "records" {
  description         = "Customer records"
  enable_key_rotation = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "records" {
  bucket = aws_s3_bucket.records.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.records.arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_ebs_encryption_by_default" "on" {
  enabled = true
}`,
  },
  stages: [
    {
      title: 'Lock it up',
      brief: 'The auditors found unencrypted customer records on the volume and in the bucket.',
      goal: 'Encrypt the volume and the bucket, wire a KMS key to both, and reach a security score of 100.',
    },
  ],
  cutscene: {
    stage: board(
      [
        users(),
        ec2('web', 0, 0, 'Web Server'),
        ebs('vol', 1, 0, 'Data Volume', { encrypted: false }),
        s3('media', 5, 0, 'Records Bucket', { encrypted: false }),
        block('key', 'kms', 6, 2, { name: 'Records Key' }),
      ],
      [wire('users', 'web'), wire('web', 'vol'), wire('web', 'media')],
    ),
    start: ['users', 'web', 'vol', 'media'],
    beats: [
      { t: 'wire', ids: ['users--web', 'web--vol', 'web--media'] },
      { t: 'caption', text: 'The supermarket’s auditors arrive with a list.' },
      { t: 'camera', shot: 'close', on: 'vol' },
      { t: 'callout', on: 'vol', title: 'Encrypted: no', body: 'Customer addresses in plain text', tone: 'bad' },
      { t: 'callout', on: 'media', title: 'Encrypted: no', body: 'Records uploaded in 2021', tone: 'bad' },
      { t: 'stat', label: 'Audit findings', value: 2, tone: 'bad' },
      { t: 'speech', who: 'security', text: 'Share one snapshot by mistake and every address on it is readable. Encrypted, a leaked copy is useless.' },
      { t: 'spawn', ids: ['key'], hold: 900 },
      { t: 'camera', shot: 'low', on: 'key' },
      { t: 'speech', who: 'security', text: 'One key we control, and CloudTrail logs every time it’s used.' },
      { t: 'clear' },
      { t: 'caption', text: 'Encrypt the volume and the bucket with a KMS key.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'encrypting the bucket the auditors named, but not the disk',
    change: { set: { vol: { encrypted: false } } },
    fails: 's1-1',
  },
};

const level59: LevelStory = {
  text: {
    title: 'Storage Zombies',
    tagline: 'Disks that aren’t attached to anything still send a bill.',
    concepts: ['Unattached EBS volumes', 'Cost hygiene', 'Snapshots'],
    briefing:
      'The shop runs one server with one disk, but the bill shows two more volumes and a file share. Delete the storage that isn’t attached to anything, and keep the bill under $40 a month.',
    docTips: [
      'Volumes added to an instance don’t delete with it unless DeleteOnTermination is set. Look for EBS volumes in the “available” state; snapshot any you might need, then delete them.',
    ],
    conceptCard: {
      title: 'Orphaned storage',
      summary:
        'Storage bills for what is provisioned, whether or not anything uses it. Detached EBS volumes and unmounted file systems are a common, quiet source of waste.',
      analogy: 'Paying rent on a storage unit you forgot you had.',
      keyTakeaway: 'If storage isn’t attached to anything, snapshot what matters and delete the rest.',
    },
    iacSnippet: `resource "aws_instance" "web" {
  ami           = data.aws_ami.al2023.id
  instance_type = "t3.micro"

  ebs_block_device {
    device_name           = "/dev/sdf"
    volume_size           = 50
    delete_on_termination = true
  }
}`,
  },
  stages: [
    {
      title: 'Storage zombies',
      brief: 'Detached disks and an unused file share are quietly billing you.',
      goal: 'Delete the storage that isn’t attached to anything, keeping the bill under $40 a month.',
    },
  ],
  cutscene: {
    stage: board(
      [
        users(),
        ec2('web', 0, 0, 'Web Server'),
        ebs('vol', 1, 0, 'Data Volume'),
        ebs('z1', 1, 2, 'Volume from Old Server'),
        ebs('z2', 2, -2, 'Detached Volume'),
        efs('z3', 4, 2, 'Unused Share'),
      ],
      [wire('users', 'web'), wire('web', 'vol')],
    ),
    start: ['users', 'web', 'vol'],
    beats: [
      { t: 'wire', ids: ['users--web', 'web--vol'] },
      { t: 'caption', text: 'First of the month. Tom opens the storage bill.' },
      { t: 'speech', who: 'finance', text: 'One server, one disk. So why am I paying for four lots of storage?' },
      { t: 'spawn', ids: ['z1', 'z2', 'z3'], hold: 900 },
      { t: 'camera', shot: 'top' },
      { t: 'callout', on: 'z2', title: 'Detached Volume', body: 'Attached to nothing since March', tone: 'warn' },
      { t: 'callout', on: 'z3', title: 'Unused Share', body: 'No connections in 60 days', tone: 'warn' },
      { t: 'stat', label: 'Wasted / month', value: 66, prefix: '$', tone: 'bad' },
      { t: 'camera', shot: 'close', on: 'z1' },
      { t: 'speech', who: 'oncall', text: 'Leftovers from the resize. The servers went; their extra volumes stayed.' },
      { t: 'clear' },
      { t: 'caption', text: 'Delete the storage that isn’t attached to anything.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'keeping the detached volume “just in case”',
    change: { add: 'z2:ebs@2,-2' },
    fails: 'finops.idle',
  },
};

const level60: LevelStory = {
  text: {
    title: 'Launch Day Storage',
    tagline: 'Assessment: disks, a shared folder and video at the edge, each in its place.',
    concepts: ['Amazon EBS', 'Amazon EFS', 'Amazon S3', 'Amazon CloudFront'],
    briefing:
      'Rio’s own-brand range launches in the supermarket on Monday, with a video for every product. Build two servers behind the load balancer, each with its own disk and both sharing one folder. Then serve the videos from S3 through CloudFront.',
    docTips: [
      'Match the store to the job: one EBS volume per server for its own data, one EFS file system for files every server shares.',
      'Video never needs to touch a server. Put it in S3 and let CloudFront deliver it.',
    ],
    conceptCard: {
      title: 'Choosing storage',
      summary:
        'EBS is a fast disk for one server. EFS is a folder many servers share. S3 is durable object storage for files of any size, best delivered through CloudFront.',
      analogy: 'A desk drawer each, a shared filing cabinet, and a warehouse with a delivery fleet.',
      keyTakeaway: 'Disk for one, folder for many, bucket for everything you keep or deliver.',
    },
    iacSnippet: `resource "aws_efs_mount_target" "shared" {
  for_each        = toset([aws_subnet.app_a.id, aws_subnet.app_b.id])
  file_system_id  = aws_efs_file_system.shared.id
  subnet_id       = each.value
  security_groups = [aws_security_group.efs.id]
}

resource "aws_ebs_volume" "data" {
  for_each          = aws_instance.web
  availability_zone = each.value.availability_zone
  size              = 50
  type              = "gp3"
  encrypted         = true
}`,
  },
  stages: [
    {
      title: 'Servers and disks',
      brief: 'Two servers, each with its own disk, sharing one folder.',
      goal: 'Two servers behind the load balancer, each with its own EBS volume, both mounting one EFS.',
    },
    {
      title: 'Video delivery',
      brief: 'Product videos should come from object storage, delivered from the edge.',
      goal: 'Serve the videos from an S3 bucket through CloudFront.',
    },
  ],
  cutscene: {
    stage: board(
      [
        users(),
        alb(),
        ec2('web1', 1, -1, 'Server A'),
        ec2('web2', 1, 1, 'Server B'),
        ebs('boot1', 2, -1, 'Volume A'),
        ebs('boot2', 2, 1, 'Volume B'),
        efs('share', 4, 0),
        cdn(-3, 2),
        s3('media', -2, 2, 'Video Bucket'),
      ],
      [
        wire('users', 'alb'),
        wire('alb', 'web1'),
        wire('alb', 'web2'),
        wire('web1', 'boot1'),
        wire('web2', 'boot2'),
        wire('web1', 'share'),
        wire('web2', 'share'),
        wire('users', 'cdn'),
        wire('cdn', 'media'),
      ],
    ),
    start: ['users', 'alb'],
    beats: [
      { t: 'speech', who: 'founder', text: 'Monday, our own-brand range goes into 400 supermarkets, with a video for every product.' },
      { t: 'spawn', ids: ['web1', 'web2'] },
      { t: 'spawn', ids: ['boot1', 'boot2'] },
      { t: 'spawn', ids: ['share'] },
      { t: 'wire', ids: ['users--alb', 'alb--web1', 'alb--web2', 'web1--boot1', 'web2--boot2', 'web1--share', 'web2--share'] },
      { t: 'traffic', expect: 'served', hold: 3000 },
      { t: 'camera', shot: 'top' },
      { t: 'speech', who: 'cto', text: 'A disk for each server, one shared folder for both. Neither is the place for video.' },
      { t: 'spawn', ids: ['cdn', 'media'], hold: 900 },
      { t: 'camera', shot: 'close', on: 'cdn' },
      { t: 'speech', who: 'oncall', text: 'Videos live in S3 and go out through CloudFront. The servers never touch them.' },
      { t: 'camera', shot: 'wide' },
      { t: 'clear' },
      { t: 'caption', text: 'Build the launch-day storage, every piece in its place.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'one EBS volume shared by both servers',
    change: { remove: ['boot2'], wire: 'web2-boot1' },
    fails: 'link.ebs_multi_attach',
  },
};

export const MODULE_6_STORIES: Record<number, LevelStory> = {
  51: level51,
  52: level52,
  53: level53,
  54: level54,
  55: level55,
  56: level56,
  57: level57,
  58: level58,
  59: level59,
  60: level60,
};
