# Contributing to Parameter Efficient Fine-Tuning

Thank you for your interest in contributing to Parameter Efficient Fine-Tuning!
This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Commit Message Conventions](#commit-message-conventions)
- [Issue Reporting](#issue-reporting)
- [Feature Requests](#feature-requests)

## Code of Conduct

This project and everyone participating in it is governed by our
[Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to
uphold this code. Please report unacceptable behavior to royxforge@gmail.com.

## Getting Started

1. Fork the repository on GitHub.
2. Clone your fork locally:
   ```
   git clone https://github.com/your-username/parameter-efficient-fine-tuning.git
   cd parameter-efficient-fine-tuning
   ```
3. Add the upstream repository:
   ```
   git remote add upstream https://github.com/royxforge/parameter-efficient-fine-tuning.git
   ```

## Development Setup

### Prerequisites

- Python 3.10+
- Node.js 20+
- npm

### Backend Setup

```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### Frontend Setup

```bash
cd frontend
npm install
```

### Verify Installation

```bash
# Backend
python -c "from backend.main import app; print('Backend OK')"

# Frontend
cd frontend && npm run lint
```

## Coding Standards

### Python

- Follow [PEP 8](https://peps.python.org/pep-0008/) style guide.
- Use type annotations for all function signatures.
- Maximum line length: 88 characters.
- Use descriptive variable names.

### TypeScript/Next.js

- Follow the project's ESLint configuration.
- Use TypeScript strict mode.
- Use React functional components with hooks.
- Use Tailwind CSS utility classes.

## Testing

### Backend Tests

```bash
pytest backend/tests/ -v
```

### Frontend Build

```bash
cd frontend && npm run build
```

Before submitting changes that affect the training pipeline, verify that
experiments run end-to-end.

## Pull Request Process

1. Create a new branch from `main`:
   ```
   git checkout -b feature/your-feature-name
   ```

2. Make your changes with clear, descriptive commit messages.

3. Run tests:
   ```bash
   pytest backend/tests/ -v
   cd frontend && npm run build
   ```

4. Push your branch and open a Pull Request on GitHub.

5. In your PR description, include:
   - What the change does
   - Any relevant issue numbers
   - How you tested the change
   - Screenshots if applicable

6. Request review from a maintainer.

## Commit Message Conventions

We follow conventional commit format:

```
<type>(<scope>): <description>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:
```
feat(training): add gradient checkpointing for memory optimization
fix(frontend): correct dataset upload progress indicator
docs(readme): update QLoRA benchmark results
```

## Issue Reporting

### Bug Reports

When filing a bug report, please include:

- A clear, descriptive title
- Steps to reproduce the issue
- Expected behavior and actual behavior
- Environment details (OS, Python version, CUDA version)
- Relevant logs or error messages

### Feature Requests

We welcome feature suggestions! Please include:

- A clear description of the proposed feature
- The motivation or use case
- Whether you are willing to implement it

Thank you for helping make Parameter Efficient Fine-Tuning better!
