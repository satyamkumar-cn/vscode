FROM ubuntu:16.04

LABEL description="Devspaces implementation for VSCode project"

RUN apt-get update \
 && apt-get install -y build-essential curl fakeroot git libasound2 libgtk-3-0 libsecret-1-dev libx11-dev libxkbfile-dev libxss1 python2.7 python-pip rpm software-properties-common sudo wget \
 && apt-get clean \
 && curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash - \
 && apt-get update \
 && apt-get install -y nodejs \
 && apt-get clean \
 && curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add - \
 && echo "deb https://dl.yarnpkg.com/debian/ stable main" | sudo tee /etc/apt/sources.list.d/yarn.list \
 && apt-get update \
 && apt-get install -y yarn \
 && apt-get clean
 
 WORKDIR /data
 
 CMD tail -f /dev/null