#!/bin/bash
sudo yum update
sudo yum upgrade
sudo amazon-linux-extras install -y nginx1
sudo amazon-linux-extras install -y epel
# sudo yum remove libuv -y
# sudo yum install libuv --disableplugin=priorities
sudo yum install -y curl
curl -sL https://rpm.nodesource.com/setup_16.x | sudo -E bash -
sudo yum install -y nodejs
sudo curl -o amazon-cloudwatch-agent.rpm https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm
sudo rpm -U amazon-cloudwatch-agent.rpm
touch config.json
cat <<EOF >> config.json
{
  "agent": {
    "metrics_collection_interval": 10,
    "logfile": "/var/logs/amazon-cloudwatch-agent.log"
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/home/ec2-user/webapp/logs/csye6225.log",
            "log_group_name": "csye6225",
            "log_stream_name": "webapp"
          }
        ]
      }
    },
    "log_stream_name": "cloudwatch_log_stream"
  },
  "metrics": {
    "metrics_collected": {
      "statsd": {
        "service_address": ":8125",
        "metrics_collection_interval": 15,
        "metrics_aggregation_interval": 15
      }
    }
  }
}
EOF

sudo mv config.json /opt/aws/amazon-cloudwatch-agent/bin/

mkdir webapp
mv webapp.zip webapp/
cd webapp

unzip webapp.zip
rm webapp.zip
rm -r __MACOSX
# cd webapp
mkdir uploads
mkdir logs
npm install
cd ..
sudo chmod 750 webapp
# touch webapp.service
# cat <<EOF >> webapp.service
# [Unit]
# Description=app.js - making your environment variables rad
# After=network.target

# [Service]
# Type=simple
# User=ec2-user
# WorkingDirectory=/home/ec2-user/webapp
# ExecStart=/usr/bin/node /home/ec2-user/webapp/server.js
# Environment=DB_DATABASE=cloudDB
# Environment=DB_USER=root
# Environment=DB_PASSWORD=Dinesh@123
# Environment=DB_HOST=localhost
# Restart=on-failure

# [Install]
# WantedBy=multi-user.target
# EOF
# sudo mv webapp.service /etc/systemd/system/
# sudo systemctl daemon-reload
# sudo systemctl restart webapp.service
# sudo systemctl enable webapp.service
# sudo systemctl status webapp.service


