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

- `npm start` will start the webpack server on [`localhost:9000`](http://localhost:9000) and build the library.
    - You can navigate examples if needed:
        - [./example/codepen-demo.html](http://localhost:9000/example/codepen-demo.html)
        - [./example/dual-joysticks.html](http://localhost:9000/example/dual-joysticks.html)
        - [./example/lock-axes.html](http://localhost:9000/example/lock-axes.html)
- `npm test` will test using CasperJS, you have to run `npm start` in another window to have a local server available to CasperJS.
