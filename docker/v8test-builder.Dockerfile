ARG V8_BRANCH="main"
FROM node:26.12.1-bookworm@sha256:5c4012d11d9857c42713ba511fbc19645cac1706bb710d51d42b0d301dff7f88 AS v8builder

# Debian bookworm marks the system Python as externally managed (PEP 668); allow the depot_tools pip install.
ENV PIP_BREAK_SYSTEM_PACKAGES=1

ARG V8_BRANCH

WORKDIR /build

ENV PATH=$PATH:/build/depot_tools/
ENV PATH=$PATH:/build/v8/tools/dev/

RUN apt-get update -y \
    && apt-get install -y \
    curl \
    git \
    libglib2.0-dev \
    libxml2 \
    python3 \
    python3-pip \
    lsb-release \
    && apt-get clean;

# fetch and build v8
RUN pip3 install httplib2 six \
    && git clone https://chromium.googlesource.com/chromium/tools/depot_tools.git --progress --verbose \
    && fetch v8 \
    && cd v8 \
    && git checkout $V8_BRANCH \
    && gclient sync \
    && tools/dev/gm.py x64.release \
    && rm -rf .git buildtools third_party;

