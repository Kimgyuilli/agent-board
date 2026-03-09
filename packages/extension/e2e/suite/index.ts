import * as path from "path";
import Mocha = require("mocha");
import { glob } from "glob";

export function run(): Promise<void> {
  const mocha = new Mocha({
    ui: "bdd",
    timeout: 30000,
    color: true,
  });

  const testsRoot = path.resolve(__dirname);

  return new Promise((resolve, reject) => {
    glob("**/*.test.js", { cwd: testsRoot })
      .then((files) => {
        for (const f of files) {
          mocha.addFile(path.resolve(testsRoot, f));
        }

        mocha.run((failures: number) => {
          if (failures > 0) {
            reject(new Error(`${failures} test(s) failed.`));
          } else {
            resolve();
          }
        });
      })
      .catch(reject);
  });
}
