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
# sudo yum install npm
# sudo yum install -y https://dev.mysql.com/get/mysql80-community-release-el7-5.noarch.rpm
# sudo yum install -y mysql-community-server
# sudo systemctl start mysqld
# sudo systemctl enable mysqld
# passwords=$(sudo grep 'temporary password' /var/log/mysqld.log | awk {'print $13'})
# mysql -u root -p$passwords --connect-expired-password -e "ALTER USER 'root'@'localhost' IDENTIFIED BY 'Dinesh@123';"
# mysql -u root -pDinesh@123 -e "create database cloudDB;"
# echo 'export DB_DATABASE=cloudDB' >> ~/.bashrc
# echo 'export DB_USER=root' >> ~/.bashrc
# echo 'export DB_PASSWORD=Dinesh@123' >> ~/.bashrc
# echo 'export DB_HOST=localhost' >> ~/.bashrc
mkdir webapp
mv webapp.zip webapp/
cd webapp

unzip webapp.zip
rm webapp.zip
rm -r __MACOSX
# cd webapp
mkdir uploads
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


