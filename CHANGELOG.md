# Changelog

All notable changes to this project will be documented in this file.

## 2.3 (2024-08-14)

> Fixed dependabot security finding [#7](https://github.com/aws-actions/aws-devicefarm-mobile-device-testing/security/dependabot/7).


## 2.2 (2024-07-30)

> Fixed dependabot security finding [#6](https://github.com/aws-actions/aws-devicefarm-mobile-device-testing/security/dependabot/6).


## 2.1 (2024-06-04)

> Fixed bug identified in issue [#8](#8) where `configuration` section in `run-settings-json` could not be excluded.

## 2.0 (2023-10-13)

> **_BREAKING CHANGES_**
>
> Inputs `run-name` and `run-settings-path` have been removed in this release.

### Features

* Replaced input `run-settings-path` with `run-settings-json` - [Issue #1](https://github.com/aws-actions/aws-devicefarm-mobile-device-testing/issues/1)
* Added output `console-url` [Issue #2](https://github.com/aws-actions/aws-devicefarm-mobile-device-testing/issues/2)
* Upgraded runtime to `node20` from `node16`
