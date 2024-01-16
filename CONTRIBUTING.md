## Coding Guidelines

### 2 Spaces for Indentation Rather Than Tabs

Remember to change your settings in your editor to use 2 spaces when you create a new file.

### Add UX and ALGO Comments

Add comments to your code to explain the code related to user experience and algorithms.

### Format Your Code

Before pushing a commit, run `npm run format`, or else your commit will fail.

### Follow Naming Conventions

Self explanatory. Follow the conventions of the language you are using. For example, in TypeScript, use camelCase for variables and functions, and PascalCase for classes.

Use [BEM Approach](https://en.bem.info/methodology/quick-start/) for CSS class names and file structure.

## Workflow

### Use Issue Templates

Self explanatory. Use the issue templates when creating an issue.

### Commit Messages

> [!WARNING]
> Hey! before you push a commit, run `npm run format`, to make sure it passes the precommit hook
>
> (If you want to ignore the pre-commit check, run the commit command with `--no-verify`)

You must follow the [gitmoji](https://gitmoji.dev/) convention for commit messages.

The emoji should be the first thing in the message, followed by a verb in the imperative mood, and the rest of the message should be in the present tense.

The emoji is in text form. You should take the emoji from the [gitmoji](https://gitmoji.dev/) website, do not use your own emoji. The first letter of the message should be capitalized. No period at the end of the message.

here is a valid example --> `:sparkles: Add new feature`

Exceptions to this rule are:

- `:truck:` for merge branches instead of `:twisted_rightwards_arrows:`

### Branch Naming

Examples: `feature/<feature-name>`, `bugfix/<bug-name>`, `hotfix/<hotfix-name>`

### Never Push Directly to Main, Always Create a Branch With Pull Request

Do not push directly to main. You should create a branch with a pull request. Then, you can continue to work on your branch and push your commits to the branch.

### Don't be Afraid to Push Your Code

Do not keep a ton of commits locally, squash them into one commit and push it when you are done. You should push your commits to the branch often, so that you can get feedback on your code as soon as possible.

### Continuous Integration

See: https://en.wikipedia.org/wiki/Continuous_integration

> The longer development continues on a branch without merging back to the mainline, the greater the risk of multiple integration conflicts and failures when the developer branch is eventually merged back.

Although we might not be able to follow continuous integration practice perfectly, we should try our best to follow some of the principles.

To reduce merge conflicts with main and other branches, Jerry will review your code and merge even if it is not finished. It may be merged into main multiple times before it is finished. You should also backmerge main into your branch often to keep your branch up to date with others.
