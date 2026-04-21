/**
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Legacy environments config — DEACTIVATED
 *
 * Firebase config has been removed. This file exists only as a stub.
 */

declare const window: any;

export declare interface BootstrapData {
  viewCodeLink?: string;
  viewCodeMessage?: string;
}

const bootstrapData = window['APP_TEMPLATE_BOOTSTRAP'] as BootstrapData;

if (!bootstrapData) {
  window.location.href = '/config.html';
}

export const environment = {
  viewCodeLink: bootstrapData?.viewCodeLink || '',
  viewCodeMessage: bootstrapData?.viewCodeMessage || '',
};
