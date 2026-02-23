const fs = require('fs');
const path = require('path');

function readFileSafe(targetPath) {
  if (!fs.existsSync(targetPath)) {
    console.log(`[patch-expo-ngrok] target not found, skipping: ${targetPath}`);
    return null;
  }
  return fs.readFileSync(targetPath, 'utf8');
}

function writeIfChanged(targetPath, original, next, label) {
  if (next == null) {
    console.log(`[patch-expo-ngrok] ${label}: pattern not found, skipped.`);
    return;
  }
  if (next === original) {
    console.log(`[patch-expo-ngrok] ${label}: already patched.`);
    return;
  }
  fs.writeFileSync(targetPath, next, 'utf8');
  console.log(`[patch-expo-ngrok] ${label}: patch applied.`);
}

function patchProcessJs(source) {
  if (
    source.includes('function resolveNgrokBin()') &&
    source.includes('const bundledBin = require("@expo/ngrok-bin");')
  ) {
    return source;
  }

  const search = `const { spawn, exec: execCallback } = require("child_process");
const exec = promisify(execCallback);
const bin = require("@expo/ngrok-bin");`;

  const replace = `const { spawn, spawnSync, exec: execCallback } = require("child_process");
const exec = promisify(execCallback);
const { existsSync } = require("fs");
const { resolve } = require("path");
const bundledBin = require("@expo/ngrok-bin");

// WIZY_NGROK_PATCH: prefer modern ngrok binary for free-plan compatibility.
function resolveNgrokBin() {
  const preferredCandidates = [
    process.env.EXPO_NGROK_BIN,
    process.env.NGROK_BIN,
    resolve(process.cwd(), "../ngrok"),
    resolve(process.cwd(), "ngrok"),
  ].filter(Boolean);

  for (const candidate of preferredCandidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  try {
    const check = spawnSync("ngrok", ["version"], {
      encoding: "utf8",
      windowsHide: true,
      timeout: 2000,
    });
    if (!check.error && check.status === 0) {
      return "ngrok";
    }
  } catch {}

  return bundledBin;
}

const bin = resolveNgrokBin();`;

  if (!source.includes(search)) return null;
  return source.replace(search, replace);
}

function patchClientJs(source) {
  if (source.includes('const rawBody = error && error.response ? error.response.body : undefined;')) {
    return source;
  }

  const search = `      let clientError;
      try {
        const response = JSON.parse(error.response.body);
        clientError = new NgrokClientError(
          response.msg,
          error.response,
          response
        );
      } catch (e) {
        clientError = new NgrokClientError(
          error.response.body,
          error.response,
          error.response.body
        );
      }
      throw clientError;`;

  const replace = `      let clientError;
      // WIZY_NGROK_PATCH: tolerate startup errors without HTTP response.
      const rawBody = error && error.response ? error.response.body : undefined;
      try {
        const response = JSON.parse(rawBody);
        clientError = new NgrokClientError(
          response.msg,
          error.response,
          response
        );
      } catch (e) {
        clientError = new NgrokClientError(
          rawBody || error.message || String(error),
          error && error.response,
          rawBody || { msg: error.message || String(error) }
        );
      }
      if (error && error.code) {
        clientError.code = error.code;
      }
      throw clientError;`;

  if (!source.includes(search)) return null;
  return source.replace(search, replace);
}

function patchUtilsJs(source) {
  if (source.includes('const tunnelAlreadyExists =') && source.includes('remote gone away')) {
    return source;
  }

  const search = `function isRetriable(err) {
  if (!err.response) {
    return false;
  }
  const statusCode = err.response.statusCode;
  const body = err.body;
  const notReady500 = statusCode === 500 && /panic/.test(body);
  const notReady502 =
    statusCode === 502 &&
    body.details &&
    body.details.err === "tunnel session not ready yet";
  const notReady503 =
    statusCode === 503 &&
    body.details &&
    body.details.err ===
      "a successful ngrok tunnel session has not yet been established";
  return notReady500 || notReady502 || notReady503;
}`;

  const replace = `function isRetriable(err) {
  // WIZY_NGROK_PATCH: retry transient startup and name-collision errors.
  if (!err.response) {
    return (
      err &&
      (err.code === "ECONNREFUSED" ||
        err.code === "ECONNRESET" ||
        err.code === "ETIMEDOUT")
    );
  }
  if (!err.body) {
    return false;
  }
  const statusCode = err.response.statusCode;
  const body = err.body;
  const notReady500 = statusCode === 500 && /panic/.test(body);
  const notReady502 =
    statusCode === 502 &&
    body.details &&
    (body.details.err === "tunnel session not ready yet" ||
      body.details.err === "remote gone away");
  const notReady503 =
    statusCode === 503 &&
    body.details &&
    body.details.err ===
      "a successful ngrok tunnel session has not yet been established";
  const tunnelAlreadyExists =
    statusCode === 400 &&
    body.error_code === 102 &&
    body.details &&
    typeof body.details.err === "string" &&
    body.details.err.includes("already exists");
  return notReady500 || notReady502 || notReady503 || tunnelAlreadyExists;
}`;

  if (!source.includes(search)) return null;
  return source.replace(search, replace);
}

function patchIndexJs(source) {
  if (source.includes('const tunnelOpts = { ...opts };') && source.includes('delete tunnelOpts.configPath;')) {
    return source;
  }

  const search = `async function connectRetry(opts, retryCount = 0) {
  opts.name = String(opts.name || uuid.v4());
  try {
    const response = await ngrokClient.startTunnel(opts);
    return response.public_url;
  } catch (err) {
    if (!isRetriable(err) || retryCount >= 100) {
      throw err;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
    return connectRetry(opts, ++retryCount);
  }
}`;

  const replace = `async function connectRetry(opts, retryCount = 0) {
  opts.name = String(opts.name || uuid.v4());
  // WIZY_NGROK_PATCH: strip legacy tunnel options for ngrok v3 API.
  const tunnelOpts = { ...opts };
  delete tunnelOpts.configPath;
  delete tunnelOpts.onStatusChange;
  delete tunnelOpts.onLogEvent;
  delete tunnelOpts.port;
  delete tunnelOpts.host;
  delete tunnelOpts.authtoken;
  delete tunnelOpts.authtoken_from_env;
  try {
    const response = await ngrokClient.startTunnel(tunnelOpts);
    return response.public_url;
  } catch (err) {
    if (!isRetriable(err) || retryCount >= 100) {
      throw err;
    }
    if (
      err &&
      err.body &&
      err.body.error_code === 102 &&
      err.body.details &&
      typeof err.body.details.err === "string" &&
      err.body.details.err.includes("already exists")
    ) {
      opts.name = String(uuid.v4());
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
    return connectRetry(opts, ++retryCount);
  }
}`;

  if (!source.includes(search)) return null;
  return source.replace(search, replace);
}

function main() {
  const base = path.join(__dirname, '..', 'node_modules', '@expo', 'ngrok');

  const processPath = path.join(base, 'src', 'process.js');
  const processSource = readFileSafe(processPath);
  if (processSource != null) {
    writeIfChanged(processPath, processSource, patchProcessJs(processSource), 'process.js');
  }

  const clientPath = path.join(base, 'src', 'client.js');
  const clientSource = readFileSafe(clientPath);
  if (clientSource != null) {
    writeIfChanged(clientPath, clientSource, patchClientJs(clientSource), 'client.js');
  }

  const utilsPath = path.join(base, 'src', 'utils.js');
  const utilsSource = readFileSafe(utilsPath);
  if (utilsSource != null) {
    writeIfChanged(utilsPath, utilsSource, patchUtilsJs(utilsSource), 'utils.js');
  }

  const indexPath = path.join(base, 'index.js');
  const indexSource = readFileSafe(indexPath);
  if (indexSource != null) {
    writeIfChanged(indexPath, indexSource, patchIndexJs(indexSource), 'index.js');
  }
}

main();
