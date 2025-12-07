// *****************************************************************************
// Copyright (C) 2024 EclipseSource GmbH.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// This Source Code may also be made available under the following Secondary
// Licenses when the conditions for such availability set forth in the Eclipse
// Public License v. 2.0 are satisfied: GNU General Public License, version 2
// with the GNU Classpath Exception which is available at
// https://www.gnu.org/software/classpath/license.html.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

/**
 * Service token type - can be a symbol, string, or class constructor
 */
export type ServiceToken<T = any> = symbol | string | (new (...args: any[]) => T) | Function;

/**
 * Service registry for managing singleton services without dependency injection framework.
 * Replaces Inversify Container functionality with explicit service registration.
 */
export class ServiceRegistry {
    private singletons = new Map<ServiceToken, any>();
    private factories = new Map<ServiceToken, () => any>();
    private initializing = new Set<ServiceToken>();

    /**
     * Register a singleton service factory.
     * The factory will be called once when the service is first requested.
     * 
     * @param token - Service identifier (symbol, string, or class)
     * @param factory - Factory function that creates the service instance
     */
    registerSingleton<T>(token: ServiceToken<T>, factory: () => T): void {
        if (this.factories.has(token)) {
            console.warn(`Service ${this.tokenToString(token)} is already registered. Overwriting.`);
        }
        this.factories.set(token, factory);
    }

    /**
     * Get a service instance. If not yet instantiated, creates it using the registered factory.
     * 
     * @param token - Service identifier
     * @returns Service instance
     * @throws Error if service is not registered or circular dependency detected
     */
    get<T>(token: ServiceToken<T>): T {
        // Check if already instantiated
        if (this.singletons.has(token)) {
            return this.singletons.get(token) as T;
        }

        // Check for circular dependency
        if (this.initializing.has(token)) {
            throw new Error(`Circular dependency detected: ${this.tokenToString(token)}`);
        }

        // Get factory
        const factory = this.factories.get(token);
        if (!factory) {
            throw new Error(`Service not registered: ${this.tokenToString(token)}`);
        }

        // Create instance
        this.initializing.add(token);
        try {
            const instance = factory();
            this.singletons.set(token, instance);
            return instance as T;
        } finally {
            this.initializing.delete(token);
        }
    }

    /**
     * Try to get a service instance. Returns undefined if not registered.
     * 
     * @param token - Service identifier
     * @returns Service instance or undefined
     */
    tryGet<T>(token: ServiceToken<T>): T | undefined {
        if (this.factories.has(token)) {
            return this.get<T>(token);
        }
        return undefined;
    }

    /**
     * Check if a service is registered.
     * 
     * @param token - Service identifier
     * @returns True if service is registered
     */
    has(token: ServiceToken): boolean {
        return this.factories.has(token);
    }

    /**
     * Clear all registered services and instances.
     * Useful for testing.
     */
    clear(): void {
        this.singletons.clear();
        this.factories.clear();
        this.initializing.clear();
    }

    /**
     * Convert token to string for error messages
     */
    private tokenToString(token: ServiceToken): string {
        if (typeof token === 'symbol') {
            return token.toString();
        }
        if (typeof token === 'string') {
            return token;
        }
        if (typeof token === 'function') {
            return token.name || 'Function';
        }
        return String(token);
    }
}
