# AWS Device Farm Automated Test for GitHub Actions

Runs an Automated Test on AWS Device Farm.

This GitHub Action allows you to run [automated app testing](https://docs.aws.amazon.com/devicefarm/latest/developerguide/welcome.html#automated-test-intro) on [AWS Device Farm](https://aws.amazon.com/device-farm/).
For example, testing new versions of code being committed to a branch to ensure the App works as desired before proceeding with the next step in the release cycle.

## Table of Contents

<!-- toc -->

- [AWS Device Farm Automated Test for GitHub Actions](#aws-device-farm-automated-test-for-github-actions)
  - [Table of Contents](#table-of-contents)
  - [Input options](#input-options)
  - [Output options](#output-options)
  - [Examples of Usage](#examples-of-usage)
    - [Running an Automated Test](#running-an-automated-test)
      - [Before each of the following examples, make sure to include the following](#before-each-of-the-following-examples-make-sure-to-include-the-following)
      - [Run Device Farm Test and download all artifacts](#run-device-farm-test-and-download-all-artifacts)
      - [Run Device Farm Test and download only video and screenshot artifacts](#run-device-farm-test-and-download-only-video-and-screenshot-artifacts)
      - [Run Device Farm Test without downloading any artifacts](#run-device-farm-test-without-downloading-any-artifacts)
  - [Credentials](#credentials)
    - [AWS Credentials](#aws-credentials)
  - [Permissions](#permissions)
  - [Additional Capabilities](#additional-capabilities)
    - [Inputs](#inputs)
  - [License Summary](#license-summary)
  - [Security Disclosures](#security-disclosures)

<!-- tocstop -->

## Input options

- run-name: **REQUIRED** The name to assign to the Device Farm Automated Test Run
- run-settings-path: **REQUIRED** The path to the json file containing the run parameters. The schema for this file can be found [here](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-device-farm/Interface/ScheduleRunCommandInput/) and here is a [sample file](./run-settings.sample) to get started with.
- artifact-types: **OPTIONAL** A comma-delimited list of artifacts to be downloaded after the run completes. The valid values can be found [here](https://docs.aws.amazon.com/devicefarm/latest/APIReference/API_Artifact.html#devicefarm-Type-Artifact-type). No artifacts will be downloaded if this property is not supplied.
- upload-poll-interval: **OPTIONAL** The interval (in milliseconds) between each poll to check if a file upload is complete. Defaults to 1000 (1 second).
- run-poll-interval: **OPTIONAL** The interval (in milliseconds) between each poll to check if the test run is complete. Defaults to 30000 (30 seconds).

## Output options

- arn: The ARN of the Automated Test Run.
- status: The status of the Automated Test Run. Check [here](https://docs.aws.amazon.com/devicefarm/latest/APIReference/API_Run.html) for possible values
- result: The result of the Automated Test Run. Check [here](https://docs.aws.amazon.com/devicefarm/latest/APIReference/API_Run.html) for possible values
- artifact-folder: The name of the folder where the artifacts are downloaded. Required if calling [upload-artifact](https://github.com/actions/upload-artifact) in a following step.

## Examples of Usage

### Running an Automated Test

#### Before each of the following examples, make sure to include the following

> **_NOTE:_**
>
> The value of `role-to-assume` should be replaced with the AWS IAM Role to be used.
>
> The value of `aws-region` should be replaced with the AWS Region being used. Please note that AWS Device Farm is currently only available in the us-west-2 region.
>
> For more information on how to configure the `configure-aws-credentials` action please check [here](https://github.com/aws-actions/configure-aws-credentials).

```yaml
      - name: Checkout repo
        uses: actions/checkout@v3

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2 # More information on this action can be found below in the 'AWS Credentials' section
        with:
          role-to-assume: arn:aws:iam::123456789012:role/my-github-actions-role
          aws-region: us-west-2
```

#### Run Device Farm Test and download all artifacts

```yaml
      - name: Schedule Device Farm Automated Test
        id: run-test
        uses: aws-actions/aws-devicefarm-automated-test@v1
        with:
          run-name: GitHubAction-${{ github.workflow }}_${{ github.run_id }}_${{ github.run_attempt }}
          run-settings-path: run-settings.json
          artifact-types: ALL

      - uses: actions/upload-artifact@v3
        if: always() # This ensures the artifacts are uploaded even if the Test Run Fails
        with:
          name: AutomatedTestOutputFiles
          path: ${{ steps.run-test.outputs.artifact-folder }}
```

#### Run Device Farm Test and download only video and screenshot artifacts

```yaml
      - name: Schedule Device Farm Automated Test
        id: run-test
        uses: aws-actions/aws-devicefarm-automated-test@v1
        with:
          run-name: GitHubAction-${{ github.workflow }}_${{ github.run_id }}_${{ github.run_attempt }}
          run-settings-path: run-settings.json
          artifact-types: VIDEO,SCREENSHOT

      - uses: actions/upload-artifact@v3
        if: always() # This ensures the artifacts are uploaded even if the Test Run Fails
        with:
          name: AutomatedTestOutputFiles
          path: ${{ steps.run-test.outputs.artifact-folder }}
```

#### Run Device Farm Test without downloading any artifacts

```yaml
      - name: Schedule Device Farm Automated Test
        id: run-test
        uses: aws-actions/aws-devicefarm-automated-test@v1
        with:
          run-name: GitHubAction-${{ github.workflow }}_${{ github.run_id }}_${{ github.run_attempt }}
          run-settings-path: run-settings.json
```

## Credentials

### AWS Credentials

This action relies on the [default behaviour of the AWS SDK for Javascript](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/setting-credentials-node.html) to determine AWS credentials and region.  Use [the `aws-actions/configure-aws-credentials` action](https://github.com/aws-actions/configure-aws-credentials) to configure the GitHub Actions environment with a role using GitHub's OIDC provider and your desired region.

> **_NOTE:_**  AWS Device Farm is available in `us-west-2` region only. Therefore, it is important to specify `us-west-2` as the value of the `aws-region` property in the `configure-aws-credentials` step.

```yaml
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          role-to-assume: arn:aws:iam::123456789012:role/my-github-actions-role
          aws-region: us-west-2

      - name: Schedule Device Farm Automated Test
        id: run-test
        uses: aws-actions/aws-devicefarm-automated-test@v1
        with:
          run-name: GitHubAction-${{ github.workflow }}_${{ github.run_id }}_${{ github.run_attempt }}
          run-settings-path: run-settings.json
```

We recommend following [Amazon IAM best practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html) when using AWS services in GitHub Actions workflows, including:

- [Assume an IAM role](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html#bp-workloads-use-roles) to receive temporary credentials. See the [Sample IAM Role CloudFormation Template](https://github.com/aws-actions/configure-aws-credentials#sample-iam-role-cloudformation-template) in the `aws-actions/configure-aws-credentials` action to get an example.
- [Grant least privilege](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html#grant-least-privilege) to the IAM role used in GitHub Actions workflows.  Grant only the permissions required to perform the actions in your GitHub Actions workflows.  See the Permissions section below for the permissions required by this action.
- [Monitor the activity](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html#remove-credentials) of the IAM role used in GitHub Actions workflows.

## Permissions

This action requires the following minimum set of permissions to run an Automated Test:

> **_NOTE:_**
>
> ${Account} should be replaced with the AWS Account Id where the test will run
>
> ${ProjectId} should be replaced with the Id of the AWS Device Farm being used if you wish to restrict the action to only one project, otherwise replace this with a `*`.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "devicefarm:ListProjects",
        "devicefarm:ListVPCEConfigurations",
        "devicefarm:ListJobs",
        "devicefarm:ListSuites",
        "devicefarm:ListTests",
        "devicefarm:ListArtifacts"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "devicefarm:ListNetworkProfiles",
        "devicefarm:ListDevicePools",
        "devicefarm:ListUploads",
        "devicefarm:CreateUpload"
      ],
      "Resource": "arn:aws:devicefarm:us-west-2:${Account}:project:${ProjectId}"
    },
    {
      "Effect": "Allow",
      "Action": [
        "devicefarm:ScheduleRun"
      ],
      "Resource": [
        "arn:aws:devicefarm:us-west-2:${Account}:project:${ProjectId}",
        "arn:aws:devicefarm:us-west-2::devicepool:*",
        "arn:aws:devicefarm:us-west-2:${Account}:devicepool:*",
        "arn:aws:devicefarm:us-west-2:${Account}:upload:*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": "devicefarm:GetRun",
      "Resource": [
        "arn:aws:devicefarm:us-west-2:${Account}:run:*",
        "arn:aws:devicefarm:us-west-2:${Account}:project:${ProjectId}"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "devicefarm:GetUpload",
        "devicefarm:ListUploads",
        "devicefarm:DeleteUpload"
      ],
      "Resource": [
        "arn:aws:devicefarm:us-west-2:${Account}:upload:*",
        "arn:aws:devicefarm:us-west-2:${Account}:project:${ProjectId}"
      ]
    }
  ]
}
```

## Additional Capabilities

### Inputs

- `run-settings-path`

  As mentioned above, this property sets the path to the json run settings file. Withing the schema for this file there a number of fields that refer to an existing resource ARN within the AWS Account.

  This Action has enhanced these fields to be multi-use so as to be more flexible when used within a GitHub Action. There are 2 different types of ARN fields that behave slightly differently:

  - `projectArn`, `devicePoolArn`, `networkProfileArn`, `vpceConfigurationArns`

    In addition to supporting the value of an ARN of an existing resource, these fields support the use of a **resource name** as well. For example, if `"projectArn": "Test"` is supplied in the json file, the Action will perform a lookup in the AWS Account to find and retrieve the ARN of the AWS Device Farm Project with the name `Test`.

  - `appArn`, `testPackageArn`, `testSpecArn`, `extraDataPackageArn`

    In addition to supporting the value of an ARN of an existing resource, these fields support the use of a **file path** as well. For example, if `"appArn": "dist/test.apk"` is supplied in the json file, the Action will perform an upload of the file `dist/test.apk` to the AWS Device Farm Project.

    In a similar way to the `projectArn` field it is also possible to supply the **resource name**. For example, if `"testSpecArn": "Test Spec 001.yaml"` is supplied in the json file, the Action will perform a lookup in the AWS Account to find and retrieve the ARN of the existing Test Specification with the name `Test Spec 001.yaml` within the AWS Device Farm Project.

## License Summary

This code is made available under the MIT license.

## Security Disclosures

If you would like to report a potential security issue in this project, please do not create a GitHub issue.  Instead, please follow the instructions [here](https://aws.amazon.com/security/vulnerability-reporting/) or [email AWS security directly](mailto:aws-security@amazon.com).
