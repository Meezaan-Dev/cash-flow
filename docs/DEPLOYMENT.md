# Firebase Cloud Functions API Deployment Guide

## SPA Deployment

Production is same-domain with one SPA build.

- `npm run build` emits root `dist/`.
- `vercel.json` rewrites SPA paths back to `/`, so `/dashboard/*` and `/mobisite` can be loaded directly.
- Firestore rules are deployed separately when needed:

```bash
firebase deploy --only firestore:rules
```

## Cloud Functions API

This guide provides step-by-step instructions for deploying the Firebase Cloud Functions API and configuring the React app to use it.

## Prerequisites

Complete [Security Operations](SECURITY_OPERATIONS.md) before a production deployment. Production Firebase changes should be deployed by `.github/workflows/deploy-firebase.yml` using workload identity federation; local CLI deployment is for development and emergency recovery only.

1. **Firebase CLI**: Install Firebase CLI globally

    ```bash
    npm install -g firebase-tools
    ```

2. **Firebase Project**: Make sure you have a Firebase project set up

    ```bash
    firebase login
    firebase projects:list
    ```

3. **Node.js**: Ensure you have Node.js 22+ installed

## Step 1: Initialize Firebase Functions

1. **Navigate to your project root**:

    ```bash
    cd /path/to/your/cash-flow/project
    ```

2. **Install Firebase Functions dependencies**:

    ```bash
    cd functions
    npm install
    ```

3. **Build the functions**:
    ```bash
    npm run build
    ```

## Step 2: Configure Firebase Project

1. **Initialize Firebase in your project** (if not already done):

    ```bash
    firebase init
    ```

    - Select "Functions" when prompted
    - Choose your Firebase project
    - Select TypeScript
    - Use ESLint
    - Install dependencies with npm

2. **Update firebase.json** (already created):
    ```json
    {
    	"functions": {
    		"source": "functions",
    		"predeploy": [
    			"npm --prefix \"$RESOURCE_DIR\" run lint",
    			"npm --prefix \"$RESOURCE_DIR\" run build"
    		]
    	}
    }
    ```

## Step 3: Deploy Cloud Functions

1. **Deploy the functions**:

    ```bash
    firebase deploy --only functions
    ```

2. **Note the function URLs** from the deployment output:

    ```
    ✔  functions[getUserTransactions(us-central1)] Successful create operation.
    ✔  functions[healthCheck(us-central1)] Successful create operation.

    Function URL (getUserTransactions): https://us-central1-YOUR-PROJECT-ID.cloudfunctions.net/getUserTransactions
    Function URL (healthCheck): https://us-central1-YOUR-PROJECT-ID.cloudfunctions.net/healthCheck
    ```

## Step 4: Configure React App

1. **Create environment variables**:
   Create a `.env` file in your project root:

    ```env
    VITE_API_BASE_URL=https://us-central1-YOUR-PROJECT-ID.cloudfunctions.net
    ```

2. **Update the API service** (if needed):
   The API service is already configured to use the environment variable. Make sure your `.env` file contains the correct URL.

## Step 5: Test the API

1. **Start your React app**:

    ```bash
    npm run dev
    ```

2. **Navigate to the API test page**:
    - Log in to your app
    - Click on the "API" option in the sidebar
    - Test the health check and transactions endpoints

## Step 6: Security Rules (Required)

1. Treat the checked-in `firestore.rules` as the source of truth. It requires verified owner reads and denies direct account and transaction writes; callable functions use the Admin SDK for trusted mutations. Do not replace it with broad owner `read, write` rules.

2. **Deploy security rules**:
    ```bash
    firebase deploy --only firestore:rules
    ```

Run `npm run test:rules` through the Firestore emulator before deploying rule changes.

## Troubleshooting

### Common Issues

1. **CORS Errors**:
    - The functions already include CORS headers
    - Make sure your domain is allowed in Firebase Console

2. **Authentication Errors**:
    - Ensure users are properly authenticated
    - Check that the JWT token is being sent correctly

3. **Function Deployment Errors**:
    - Check that all dependencies are installed
    - Ensure TypeScript compilation succeeds
    - Verify Firebase project configuration

### Debugging

1. **View function logs**:

    ```bash
    firebase functions:log
    ```

2. **Test functions locally**:

    ```bash
    firebase emulators:start --only functions
    ```

3. **Check function status**:
    ```bash
    firebase functions:list
    ```

## API Endpoints

### GET /getUserTransactions

- **Authentication**: Requires Bearer token in Authorization header
- **Response**: JSON array of user transactions
- **Error Handling**: Returns appropriate HTTP status codes and error messages

### GET /healthCheck

- **Authentication**: None required
- **Response**: JSON with API status and timestamp
- **Purpose**: Verify API is running

## Environment Variables

| Variable            | Description                  | Example                                                  |
| ------------------- | ---------------------------- | -------------------------------------------------------- |
| `VITE_API_BASE_URL` | Base URL for Cloud Functions | `https://us-central1-YOUR-PROJECT-ID.cloudfunctions.net` |

## Security Considerations

1. **JWT Token Validation**: The API validates Firebase ID tokens
2. **User Data Isolation**: Users can only access their own transactions
3. **CORS Protection**: Proper CORS headers are set
4. **Error Handling**: Sensitive information is not exposed in error messages

## Monitoring

1. **Firebase Console**: Monitor function usage and errors
2. **Logs**: Use `firebase functions:log` for debugging
3. **Metrics**: Track function performance in Firebase Console

## Cost Optimization

1. **Function Timeout**: Functions are configured with reasonable timeouts
2. **Cold Starts**: Consider using Firebase Functions v2 for better performance
3. **Caching**: Implement caching strategies for frequently accessed data

## Next Steps

1. **Add more endpoints** as needed (create, update, delete transactions)
2. **Implement rate limiting** for production use
3. **Add comprehensive logging** and monitoring
4. **Set up CI/CD** for automated deployments
