FROM postgres:17

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    curl \
    pkg-config \
    libssl-dev \
    libclang-dev \
    llvm-dev \
    postgresql-server-dev-all \
    && rm -rf /var/lib/apt/lists/*

# Install pgvector
RUN git clone --branch v0.5.1 https://github.com/pgvector/pgvector.git \
    && cd pgvector \
    && make \
    && make install

# Install Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Install and initialize pgrx
RUN cargo install cargo-pgrx --version 0.12.5 --locked && \
    cargo pgrx init --pg17 pg_config

# Clone and install pgvectorscale
RUN cd /tmp && \
    git clone --branch 0.5.0 https://github.com/timescale/pgvectorscale && \
    cd pgvectorscale/pgvectorscale && \
    cargo pgrx install --release

# Create initialization script to enable both extensions
RUN echo 'CREATE EXTENSION IF NOT EXISTS vector;' > /docker-entrypoint-initdb.d/01-init-vector.sql && \
    echo 'CREATE EXTENSION IF NOT EXISTS vectorscale CASCADE;' > /docker-entrypoint-initdb.d/02-init-vectorscale.sql