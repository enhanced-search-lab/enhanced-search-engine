# Proxima Frontend

This directory contains the frontend code for the Proxima academic search engine, a modern, responsive web application built with React and Vite.

## Table of Contents

- [Overview](#overview)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the Development Server](#running-the-development-server)


---

### Overview

The Proxima frontend provides a user-friendly interface for searching academic papers. Users can perform complex queries using abstracts and keywords, view detailed search results, and subscribe to specific queries to receive email updates. The application is designed to be fast, intuitive, and fully integrated with the Django backend API.


### Getting Started

Follow these instructions to get the frontend application up and running on your local machine.

#### Prerequisites

- [Node.js](https://nodejs.org/) (version 18.x or higher is recommended)
- [npm](https://www.npmjs.com/) (usually comes with Node.js)

#### Installation

1.  **Navigate to the frontend directory:**
    ```bash
    cd frontend
    ```

2.  **Install dependencies:**
    This command will download and install all the required packages defined in `package.json`.
    ```bash
    npm install
    ```

#### Running the Development Server

Once the installation is complete, you can start the local development server.

```bash
npm run dev
npm run dev -- --port 5174
```

This will start the Vite development server, typically on `http://localhost:5173`. The server features Hot Module Replacement (HMR), so changes you make to the code will be reflected in the browser instantly without a full page reload.



