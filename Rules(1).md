# Rules

## 1. Follow Requirements Exactly

- Do only what is requested.
- Do not add random features, pages, components, libraries, or functionality.
- Do not make assumptions about requirements.
- If something is not specified, keep the implementation simple.
- Do not add unnecessary text, comments, code, or explanations.
- Follow the PRD and Architecture documents as the source of truth.

## 2. Keep the Project Simple

- This project is for approximately 70 students.
- Do not build a heavy backend.
- Do not use microservices.
- Do not use Docker unless explicitly requested.
- Do not add Redis, message queues, Kubernetes, or other unnecessary infrastructure.
- Use Netlify Functions only where backend logic is required.
- Use Google Sheets as the database.
- Keep the architecture lightweight.

## 3. Technology

Use:

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Lucide React
- Netlify Functions
- Google Sheets API
- Google Sign-In

Do not add another framework or major library unless explicitly requested.

## 4. Frontend

- Keep components reusable but simple.
- Do not over-engineer components.
- Do not create abstractions without a clear need.
- Keep the UI responsive.
- Follow the provided wireframe.
- Follow the provided purple/orange visual design.
- Use the same Light/Dark mode across all pages.
- Use a professional modern font such as Inter.
- Keep the interface minimal.

## 5. Backend

- Use Netlify Functions for the minimum required server-side operations.
- Keep Google Sheets credentials on the server.
- Never expose private Google credentials in frontend code.
- Do not create a separate backend server.
- Do not introduce a heavy database.
- Do not create an admin panel unless explicitly requested.

## 6. Google Sheets

- Google Sheets is the initial database.
- Keep the spreadsheet private.
- Access Google Sheets through the backend/serverless layer.
- Only retrieve the authenticated student's data.
- Do not expose all student data to the frontend.

## 7. Authentication

- Use Google Sign-In.
- Only registered student accounts can access the portal.
- Authentication and authorization must both be checked.
- A student must not be able to access another student's data.
- Do not create a custom password system unless explicitly requested.

## 8. Security

- Never hard-code secrets.
- Use environment variables for secrets.
- Never expose service-account credentials.
- Never trust a student ID supplied by the frontend for authorization.
- Verify the authenticated user on protected requests.
- Do not expose private student information unnecessarily.

## 9. Error Handling

- Handle API errors cleanly.
- Show simple user-friendly error messages.
- Do not show stack traces to users.
- Do not expose API keys, credentials, or internal errors.
- Handle loading, empty, and error states for data-driven pages.

## 10. Code Quality

- Use TypeScript.
- Keep functions small and understandable.
- Avoid duplicate code.
- Use clear naming.
- Do not add unnecessary comments.
- Do not add unused files or dependencies.
- Remove unused imports and code.
- Keep the project structure defined in Architecture.md.

## 11. UI Rules

- Keep spacing consistent.
- Use consistent cards, buttons, inputs, and navigation.
- Avoid excessive animations.
- Avoid excessive shadows, gradients, and decorative elements.
- Do not overcrowd pages.
- Do not change the provided color direction without a request.
- Make important academic information easy to read.

## 12. Data Rules

- Student profile data is private.
- Marks are private.
- Attendance is private.
- Students can only access their own records.
- Academic data should be read-only unless the requirement explicitly allows editing.
- Do not invent student data or academic results.

## 13. Scope Rules

Do not implement features that are not requested.

Examples of features that should not be added automatically:

- Chat
- Notifications
- Payments
- Assignments
- Timetable
- Faculty portal
- Parent portal
- Social feed
- Complex analytics
- Admin dashboard
- AI features
- Heavy database systems

These can only be added when explicitly requested.

## 14. Changes

When modifying the project:

1. Read the existing requirements.
2. Make only the requested change.
3. Do not unnecessarily rewrite working code.
4. Do not change unrelated pages.
5. Do not introduce new dependencies without a reason.
6. Keep the existing design consistent.

## 15. Final Rule

**Do only what is requested. Keep everything simple, minimal, secure, and maintainable.**
