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
 * Collection for managing contributions without dependency injection framework.
 * Replaces ContributionProvider pattern from Inversify.
 */
export class ContributionCollection<T extends object> {
    private contributions = new Set<T>();

    /**
     * Add a contribution to the collection.
     * 
     * @param contribution - Contribution instance to add
     */
    add(contribution: T): void {
        this.contributions.add(contribution);
    }

    /**
     * Remove a contribution from the collection.
     * 
     * @param contribution - Contribution instance to remove
     */
    remove(contribution: T): void {
        this.contributions.delete(contribution);
    }

    /**
     * Get all contributions as an array.
     * 
     * @param recursive - For compatibility with ContributionProvider interface (ignored)
     * @returns Array of all contributions
     */
    getContributions(recursive?: boolean): T[] {
        return Array.from(this.contributions);
    }

    /**
     * Check if a contribution is in the collection.
     * 
     * @param contribution - Contribution instance to check
     * @returns True if contribution is in collection
     */
    has(contribution: T): boolean {
        return this.contributions.has(contribution);
    }

    /**
     * Get the number of contributions.
     * 
     * @returns Number of contributions
     */
    get size(): number {
        return this.contributions.size;
    }

    /**
     * Clear all contributions.
     */
    clear(): void {
        this.contributions.clear();
    }

    /**
     * Iterate over contributions.
     */
    [Symbol.iterator](): Iterator<T> {
        return this.contributions[Symbol.iterator]();
    }
}
