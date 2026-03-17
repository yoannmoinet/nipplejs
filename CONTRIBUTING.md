# Contributing Guide
Your help is more than welcome, I would be very honored to have you on my side.

Here are some very basic guidelines.

### Commits
Please follow these [guidelines](https://github.com/angular/angular.js/blob/master/DEVELOPERS.md#commits) so your commits will be taken by the self-generated changelog.

### Style
[ESLint](http://eslint.org/) is set up on the project. It will be checked at build time.

We follow a **4 spaces** rule around here.

### Workflow
You can use the available scripts if needed.

- `yarn dev` will start the dev server and build the library in watch mode.
- `yarn build` will build the library.
- `yarn lint` will lint the code using ESLint.
- `yarn test:e2e` will run end-to-end tests using Playwright.
- `yarn test:unit` will run unit tests.
