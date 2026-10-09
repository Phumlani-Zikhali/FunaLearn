# Put FunaLearn in your private GitHub repository

## Recommended: GitHub Desktop

1. Open GitHub Desktop and choose **File → Add local repository**.
2. Select your working FunaLearn project folder. It has already been prepared as a local Git repository.
3. Review the changes. You should see source code, tests, configuration and documentation. You should not see `.env`, `data`, `node_modules` or `Simulation accounts.txt`.
4. Enter a commit summary such as **Prepare FunaLearn for private repository**, then commit to `main`.
5. Choose **Publish repository** and keep **Keep this code private** selected. Confirm the destination account and repository name.

If you already created an empty repository on GitHub, add its URL as the remote using Desktop's repository settings, then push. The destination should not have its own initial README or licence commit; if it does, reconcile the histories without force-pushing over existing work.

## Clean ZIP alternative

Extract `FunaLearn-GitHub.zip` to a new folder. The archive includes only reviewed project files, not local accounts or secrets. Add that folder to GitHub Desktop and create a repository there when prompted, then commit and publish privately. Include hidden configuration files such as `.github`, `.gitignore` and `.env.example`.

Do not upload the ZIP itself if you want GitHub to display the source files. Do not upload the whole original folder through the website: browser uploads do not apply your local `.gitignore` protections automatically.

## Command-line alternative

After reviewing staged files in the prepared working project:

```sh
npm run check:repository
npm run format:check
npm test
npm run build
git diff --cached --stat
git commit -m "Prepare FunaLearn for private repository"
git remote add origin YOUR_PRIVATE_REPOSITORY_URL
git push -u origin main
```

Replace `YOUR_PRIVATE_REPOSITORY_URL` with the address of your empty private repository. If Git requests an author name/email, configure your own identity (a GitHub no-reply address is an option). No remote, commit identity or online repository is configured by the preparation step.

The repository contains source code. People still need to follow README setup instructions to run FunaLearn. Your current learner records, API settings and passwords remain only on your computer. Collaborators can generate their own simulation locally.

[GitHub's import instructions](https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github)
