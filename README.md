# Celo Projects

A Farcaster mini-app for discovering and supporting Celo ecosystem projects. Swipe through projects, endorse your favorites, and donate directly via your wallet.

**Live Site**: [celo-projects.vercel.app](https://celo-projects.vercel.app)

## Overview

Celo Projects is a Tinder-inspired interface built for Farcaster, allowing users to:
- Browse projects from Celo's ecosystem, organized by program or grant seasons.
- Swipe right to "like" and endorse projects, or left to pass.
- Connect a wallet to donate 0.1 USD to liked projects on the Celo blockchain.
- View project details, including problems, solutions, and demo links.

This app leverages the Farcaster Frame SDK, Wagmi for wallet interactions, and the KarmaHQ Gap API for project data.

## Usage in Farcaster

Celo Projects is designed as a Farcaster mini-app, accessible via Frames. To use it:

1. **Access via Farcaster**:
   - Find the Celo Projects Frame shared in a Farcaster cast (e.g., via warpcast mini app explorer).
   - Alternatively, visit [celo-projects.vercel.app](https://celo-projects.vercel.app) in a Farcaster-compatible client that supports Frames.

2. **Interact with the App**:
   - **Onboarding**: On first load, view the onboarding screen explaining swipe mechanics (right to like, left to pass).
   - **Browse Projects**: Swipe through project cards, each showing a banner, title, problem, solution, and links.
   - **Select Season**: Choose a Celo program or grant season from the dropdown to filter projects.
   - **Wallet Connection**:
     - Click "Connect Wallet" to link your Ethereum-compatible wallet (e.g., MetaMask).
     - Switch to the Celo network if prompted (Chain ID: 42220).
   - **Endorse & Donate**:
     - Swipe right to add a project to your liked list.
     - When you've reviewed all projects, click "Donate to Liked Projects" to send 0.1 USD to each liked project's payout address.

3. **Share on Farcaster**:
   - Share your liked projects or the app itself by casting a link to [celo-projects.vercel.app](https://celo-projects.vercel.app) or embedding the Frame in a cast.

## Features

- **Swipe Interface**: Intuitive Tinder-like swiping for project discovery.
- **Wallet Integration**: Connect and donate using Wagmi with Celo network support.
- **Rich Project Cards**: Display banners, markdown-parsed descriptions, and video/demo links.

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **Blockchain**: Wagmi, Viem (Celo network)
- **Farcaster**: Frame SDK for mini-app functionality
- **API**: KarmaHQ Gap API for Celo project data
- **Animation**: Framer Motion for smooth transitions
- **Deployment**: Vercel

## Setup (Local Development)

### Prerequisites
- Node.js (v18+)
- npm

### Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/gabrieltemtsen/celo-projects.git
   cd celo-projects
   ```
2. Install Dependencies:

- npm install

3. Environment Variables:
- Create a .env.local file in the root directory:
check .env.example
4. Run
 - npm run dev

