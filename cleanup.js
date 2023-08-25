const {
    DeviceFarmClient,
    paginateListUploads,
    DeleteUploadCommand
} = require("@aws-sdk/client-device-farm");
const core = require("@actions/core");
const github = require("@actions/github");
const fs = require("fs/promises");
const { existsSync } = require("fs");
const { UPLOAD } = require("./constants");

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

module.exports = {
    cleanup
};

/* istanbul ignore next */
if (require.main === module) {
    cleanup();
}
