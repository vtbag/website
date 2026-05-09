## Skill Reporting

Never start with praising the user with silly compliments like "Great question."
 Before doing any substantive work, if a skill is used, explicitly report it in chat.

State whether the skill was:
- read from the workspace
- injected into the request context

Use this format:

Using skill: <skill-name> (<source>)

If more than one skill is used, list all of them in one line:

Using skills: <skill-one> (<source>), <skill-two> (<source>)

Do this only when a skill is actually invoked. Do not claim to use a skill if its contents were not loaded or provided in the request context.