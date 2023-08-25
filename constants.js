const INPUTS = {
    runName: "run-name",
    runSettingsPath: "run-settings-path",
    artifactTypes: "artifact-types",
    uploadPollInterval: "upload-poll-interval",
    runPollInterval: "run-poll-interval",
};

const OUTPUTS = {
    arn: "arn",
    status: "status",
    result: "result",
    artifactFolder: "artifact-folder",
};

const UPLOAD = {
    STATUS: {
        INITIALIZED: "INITIALIZED",
        PROCESSING: "PROCESSING",
        SUCCEEDED: "SUCCEEDED",
        FAILED: "FAILED",
    },
    CATEGORY: {
        CURATED: 'CURATED',
        PRIVATE: 'PRIVATE',
    },
};

const RUN = {
    STATUS: {
        PENDING: "PENDING",
        PENDING_CONCURRENCY: "PENDING_CONCURRENCY",
        PENDING_DEVICE: "PENDING_DEVICE",
        PROCESSING: "PROCESSING",
        SCHEDULING: "SCHEDULING",
        PREPARING: "PREPARING",
        RUNNING: "RUNNING",
        COMPLETED: "COMPLETED",
        STOPPING: "STOPPING",
    },
    RESULT: {
        PENDING: "PENDING",
        PASSED: "PASSED",
        WARNED: "WARNED",
        FAILED: "FAILED",
        SKIPPED: "SKIPPED",
        ERRORED: "ERRORED",
        STOPPED: "STOPPED",
    },
    ARTIFACT_TYPES: [
        "SCREENSHOT",
        "FILE",
        "LOG",
    ]
};

module.exports = {
    INPUTS,
    OUTPUTS,
    UPLOAD,
    RUN,
};
