# Budget System Deployment Guide

This guide will help you deploy your Wasp budget application to production using Fly.io.

## Prerequisites

### 1. Install Required Tools

#### Wasp CLI
```bash
# Windows (PowerShell as Administrator)
curl -sSL https://get.wasp-lang.dev/installer.ps1 | iex

# macOS/Linux
curl -sSL https://get.wasp-lang.dev/installer.sh | sh

# Alternative: Download directly from GitHub releases
# Visit: https://github.com/wasp-lang/wasp/releases/latest
# Download: wasp-windows-x86_64.exe (for Windows)
```

#### Fly.io CLI
```bash
# Windows (PowerShell)
iwr https://fly.io/install.ps1 -useb | iex

# macOS
brew install flyctl

# Linux
curl -L https://fly.io/install.sh | sh
```

### 2. Set up Fly.io Account
1. Create account at [fly.io](https://fly.io)
2. Add billing information (required even for free tier)
3. Login to flyctl:
   ```bash
   fly auth login
   ```

## Environment Variables Setup

### Required Environment Variables

Create a `.env.server` file in your project root with these variables:

```env
# EMAIL CONFIGURATION (Required for SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=noreply@yourdomain.com
SMTP_FROM_NAME=Envelope Budgeter

# The following are automatically set by Wasp/Fly.io:
# DATABASE_URL=<automatically provided by Fly.io PostgreSQL>
# JWT_SECRET=<automatically generated>
# SESSION_SECRET=<automatically generated>
```

### Email Provider Options

#### Gmail
- Use App Passwords (not your regular password)
- Enable 2FA and generate an App Password

#### SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USERNAME=apikey
SMTP_PASSWORD=your-sendgrid-api-key
```

#### Mailgun
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USERNAME=your-mailgun-smtp-username
SMTP_PASSWORD=your-mailgun-smtp-password
```

## Deployment Steps

### 1. Verify Your Configuration

Navigate to your budget-system directory:
```bash
cd budget-system
```

Check that your main.wasp file has the correct email configuration:
- ✅ `provider: SMTP` (not Dummy)
- ✅ Correct sender information

### 2. Choose App Name and Region

Pick a unique app name and Fly.io region:
```bash
# App name must be unique across all Fly.io apps
APP_NAME="your-unique-budget-app-name"

# Choose a region close to your users
# mia = Miami, ams = Amsterdam, nrt = Tokyo, syd = Sydney
REGION="mia"
```

### 3. Run Initial Deployment

```bash
wasp deploy fly launch $APP_NAME $REGION
```

**Important:** 
- Do NOT interrupt this process (no Ctrl+C)
- This will take 5-15 minutes
- Creates database, builds app, and deploys both client and server

### 4. Set Environment Variables

After deployment completes, set your email configuration:

```bash
# Set SMTP configuration
wasp deploy fly cmd --context server secrets set SMTP_HOST="smtp.gmail.com"
wasp deploy fly cmd --context server secrets set SMTP_PORT="587"
wasp deploy fly cmd --context server secrets set SMTP_USERNAME="your-email@gmail.com"
wasp deploy fly cmd --context server secrets set SMTP_PASSWORD="your-app-password"
wasp deploy fly cmd --context server secrets set SMTP_FROM_EMAIL="noreply@yourdomain.com"
wasp deploy fly cmd --context server secrets set SMTP_FROM_NAME="Envelope Budgeter"

# Verify secrets are set
wasp deploy fly cmd --context server secrets list
```

### 5. Post-Deployment

After successful deployment:

1. **Save Generated Files**: Commit `fly-server.toml` and `fly-client.toml` to Git
2. **Access Your App**: URLs will be displayed in the terminal
3. **Test Email**: Try the signup/password reset flow to verify email works

## Future Updates

To deploy updates after the initial deployment:

```bash
# Make your code changes
# Commit to Git (recommended)
git add .
git commit -m "Your changes"

# Deploy updates
wasp deploy fly deploy
```

## Troubleshooting

### Common Issues

#### "App name already taken"
Choose a different unique name and run launch again.

#### "Billing information required"
Add a credit card to your Fly.io account dashboard.

#### "Email not sending"
1. Verify SMTP credentials are correct
2. Check if using Gmail App Password (not regular password)
3. Check server logs: `wasp deploy fly cmd --context server logs`

#### "Build failure"
1. Ensure your code builds locally: `wasp build`
2. Check for TypeScript errors: `wasp start` should work locally
3. Review build logs for specific errors

### Getting Help

1. **Wasp Discord**: Join the community at [discord.gg/wasp](https://discord.gg/wasp)
2. **Fly.io Status**: Check [status.fly.io](https://status.fly.io) for service issues
3. **Logs**: View server logs with `wasp deploy fly cmd --context server logs`
4. **Fly.io Dashboard**: Monitor your apps at [fly.io/dashboard](https://fly.io/dashboard)

## Security Notes

- Never commit `.env.server` files to Git
- Use environment-specific domains for email
- Consider setting up DNS records for your custom domain
- Enable monitoring and alerts for production apps

## Cost Estimation

Fly.io free tier includes:
- Up to 3 shared CPU VMs
- 160GB/month outbound data transfer
- Shared CPU performance

For production apps, consider upgrading to dedicated CPU instances. 