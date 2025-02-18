// Unless explicitly stated otherwise all files in this repository are licensed under the MIT License.
// This product includes software developed at Datadog (https://www.datadoghq.com/).
// Copyright 2019-Present Datadog, Inc.

import { ROOT } from '@nipple/tools/constants';
import path from 'path';

export const PUBLIC_DIR = path.resolve(ROOT, 'packages/tests/src/_playwright/public');
export const DEV_SERVER_PORT = 8000;
export const DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}`;
