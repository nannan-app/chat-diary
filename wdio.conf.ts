import type { Options } from "@wdio/types";
import { spawn, type ChildProcess } from "child_process";
import path from "path";
import fs from "fs";
import os from "os";

// tauri-wd process
let tauriWd: ChildProcess;

// Use a dedicated temp directory for test data — NEVER touch production data
const TEST_DATA_DIR = path.join(os.tmpdir(), "murmur-e2e-test-data");

function cleanTestData() {
  if (fs.existsSync(TEST_DATA_DIR)) {
    fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
  console.log("[setup] Test data dir:", TEST_DATA_DIR);
}

export const config: Options.Testrunner = {
  runner: "local",
  autoCompileOpts: {
    tsNodeOpts: {
      project: "./tsconfig.node.json",
    },
  },

  specs: ["./e2e/**/*.e2e.ts"],

  capabilities: [
    {
      // @ts-ignore — tauri:options is a custom capability
      "tauri:options": {
        binary: path.resolve("./src-tauri/target/debug/murmur"),
        // Pass env var to isolate test data from production
        env: {
          MURMUR_DATA_DIR: TEST_DATA_DIR,
        },
      },
    },
  ],

  logLevel: "warn",

  framework: "mocha",
  mochaOpts: {
    ui: "bdd",
    timeout: 60000,
  },

  reporters: ["spec"],
  maxInstances: 1,
  hostname: "localhost",
  port: 4444,

  onPrepare: function () {
    // Clean test data BEFORE starting the app
    cleanTestData();

    tauriWd = spawn("tauri-wd", ["--port", "4444"], {
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        MURMUR_DATA_DIR: TEST_DATA_DIR,
      },
    });

    tauriWd.stdout?.on("data", (data) => {
      const text = data.toString().trim();
      if (text) console.log("[tauri-wd]", text);
    });

    tauriWd.stderr?.on("data", (data) => {
      const text = data.toString().trim();
      if (text) console.log("[tauri-wd:err]", text);
    });

    return new Promise<void>((resolve) => {
      setTimeout(resolve, 2000);
    });
  },

  onComplete: function () {
    tauriWd?.kill();
    // Clean up test data after tests
    try {
      if (fs.existsSync(TEST_DATA_DIR)) {
        fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
      }
    } catch {}
  },
};
