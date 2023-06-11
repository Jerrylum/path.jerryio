# Security Policy

We understand path data needs to be kept secret as it might be used to gain an advantage during the competition. Therefore, we treat it as sensitive user personal information. We take the confidentiality of the path data seriously and ensure that it is handled securely and with the utmost care.

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it to us by sending an email to [me@jerryio.com](mailto:me@jerryio.com) or by messaging me on discord `jerrylum` (User ID: 298638092196249600). Please do not create public GitHub issues for security vulnerabilities.

We will acknowledge your report within 24 hours, and we will provide an estimated timeline for a fix. We may also ask for additional information to help us reproduce and address the issue.

## Supported Versions

We only support the latest version of the project. We encourage all users to use the latest version of the project by using the web app at [path.jerryio.com](path.jerryio.com), as it contains the latest security fixes and improvements.

## Security Updates

We will release security updates for this project as soon as possible after identifying and addressing a security vulnerability. We will release security updates for supported versions of the project. We will also provide information about the security vulnerability and how to address it.

## Security Measures

This project takes the following security measures to ensure the safety of its users:

- We use HTTPS to encrypt all traffic to and from the web app.
- We host the web app on GitHub Pages, which provides additional security features such as HTTPS by default and DDoS protection.
- We use input validation and sanitization to prevent common web application security vulnerabilities. Specifically, we sanitize all user input, including the path file, to prevent cross-site scripting (XSS) attacks by parsing malicious path file.
- We do not store path data in the web app or on the server. Instead, the path file are saved on the user's device only and never leave the user's device.

## Responsible Disclosure Policy

We believe in responsible disclosure of security vulnerabilities, and we encourage all security researchers to follow our responsible disclosure policy:

2. Do not attempt to disrupt the normal operation of the application or server.
3. Do not publicly disclose a vulnerability until we have had an opportunity to address it.
4. Provide us with a reasonable amount of time to address the vulnerability before publicly disclosing it.

We appreciate the efforts of security researchers to improve the security of our project, and we will acknowledge their contributions in our release notes.

## Contact

If you have any questions or concerns about this security policy, please contact us at [me@jerryio.com](mailto:me@jerryio.com).
