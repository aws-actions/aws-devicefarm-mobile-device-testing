import {
    DeviceFarmClient,
    paginateListUploads,
    DeleteUploadCommand
} from "@aws-sdk/client-device-farm";
import * as core from "@actions/core";
import * as github from "@actions/github";
import fs from "fs/promises";
import { existsSync } from "fs";
import { UPLOAD } from "./constants.js";

const deviceFarm = new DeviceFarmClient();

async function cleanup() {
    try {
        const listUploads = paginateListUploads({
            client: deviceFarm
        }, {
            arn: core.getState("projectArn"),
        });
        // Delete all private uploads that start with the runId and are not SUCCEEDED
        for await (const page of listUploads) {
            const uploads = page.uploads.filter(u => u.category == UPLOAD.CATEGORY.PRIVATE && u.name.startsWith(`${github.context.runId}_`) && u.status != UPLOAD.STATUS.SUCCEEDED);
            await Promise.all(uploads.map(upload => {
                const deleteUploadCommand = new DeleteUploadCommand({
                    arn: upload.arn
                });
                core.info(`Deleting ${upload.status} upload: ${upload.arn}`)
                deviceFarm.send(deleteUploadCommand);
            }));
        }
        // Delete the artifact folder
        const artifactFolder = core.getState("artifactFolder");
        if (existsSync(artifactFolder)) {
            fs.rm(artifactFolder, { recursive: true, force: true })
        }
    } catch (error) {
        core.setFailed(error.message);
    }
}

export {
    cleanup
};

/* istanbul ignore next */
if (import.meta.url === `file://${process.argv[1]}`) {
    cleanup();
}
