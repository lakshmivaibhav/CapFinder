'use client';

import { useState, useEffect } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/** Utility type to add an 'id' field to a given type T. */
export type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useCollection hook.
 * @template T Type of the document data.
 */
export interface UseCollectionResult<T> {
  data: WithId<T>[] | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading.
  error: FirestoreError | Error | null; // Error object, or null.
}

/* Internal implementation of Query:
  https://github.com/firebase/firebase-js-sdk/blob/c5f08a9bc5da0d2b0207802c972d53724ccef055/packages/firestore/src/lite-api/reference.ts#L143
*/
export interface InternalQuery extends Query<DocumentData> {
  _query: {
    path: {
      canonicalString(): string;
      toString(): string;
    };
    filters?: any[];
  }
}

/**
 * React hook to subscribe to a Firestore collection or query in real-time.
 * Handles nullable references/queries.
 * 
 * IMPORTANT! YOU MUST MEMOIZE the inputted memoizedTargetRefOrQuery or BAD THINGS WILL HAPPEN
 * 
 * @template T Optional type for document data. Defaults to any.
 * @param {CollectionReference<DocumentData> | Query<DocumentData> | null | undefined} targetRefOrQuery -
 * The Firestore CollectionReference or Query. Waits if null/undefined.
 * @returns {UseCollectionResult<T>} Object with data, isLoading, error.
 */
export function useCollection<T = any>(
    memoizedTargetRefOrQuery: ((CollectionReference<DocumentData> | Query<DocumentData>) & {__memo?: boolean})  | null | undefined,
): UseCollectionResult<T> {
  type ResultItemType = WithId<T>;
  type StateDataType = ResultItemType[] | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    /**
     * Safety check: Prevent listing the entire 'messages' collection without filters.
     * Standard security rules typically deny 'list' on /messages unless filtered by participant ID.
     */
    const isForbiddenMessageList = (q: any): boolean => {
      if (!q) return false;
      
      // Extract path safely
      let path = '';
      if (q.type === 'collection') {
        path = (q as CollectionReference).path;
      } else {
        const internalQuery = (q as unknown as InternalQuery)._query;
        path = internalQuery?.path?.canonicalString?.() || '';
      }

      if (path !== 'messages') return false;

      // Block raw collection references as they trigger a full list operation
      if (q.type === 'collection') return true;

      // For Query objects, ensure they have filters. An unfiltered query is effectively a list.
      const internalQuery = (q as unknown as InternalQuery)._query;
      const hasFilters = internalQuery?.filters && internalQuery.filters.length > 0;
      
      // Only ignore if it has NO filters. If it has filters, it's a targeted inquiry.
      return !hasFilters;
    };

    if (!memoizedTargetRefOrQuery || isForbiddenMessageList(memoizedTargetRefOrQuery)) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      memoizedTargetRefOrQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const results: ResultItemType[] = [];
        for (const doc of snapshot.docs) {
          results.push({ ...(doc.data() as T), id: doc.id });
        }
        setData(results);
        setError(null);
        setIsLoading(false);
      },
      (err: FirestoreError) => {
        try {
          // GRACEFUL ERROR RECOVERY: If permission error happens, do not throw error, 
          // just return empty result to prevent application crash.
          const path: string =
          memoizedTargetRefOrQuery.type === 'collection'
            ? (memoizedTargetRefOrQuery as CollectionReference).path
            : (memoizedTargetRefOrQuery as unknown as InternalQuery)._query.path.canonicalString()
        
        // Check if query has filters for accurate silencing
        const internalQuery = (memoizedTargetRefOrQuery as unknown as InternalQuery)._query;
        const hasFilters = memoizedTargetRefOrQuery.type !== 'collection' && 
                           internalQuery?.filters && 
                           internalQuery.filters.length > 0;

        // Ignore permission errors for messages collection only if unfiltered or if it's a standard permission denied error
        if (
          err.code === 'permission-denied' ||
          err.code === 'unauthenticated' ||
          (path === 'messages' && !hasFilters)
        ) {
          setData([]);
          setIsLoading(false);
          setError(null);
          return;
        }

         
          const contextualError = new FirestorePermissionError({
            operation: 'list',
            path,
          })

          setError(contextualError)
          setData(null)
          setIsLoading(false)

          // Trigger global error propagation only for non-permission-denied errors
          errorEmitter.emit('permission-error', contextualError);
        } catch (fatalError) {
          // Absolute fallback to prevent hook from crashing the UI thread
          setData([]);
          setIsLoading(false);
        }
      }
    );

    return () => unsubscribe();
  }, [memoizedTargetRefOrQuery]); 
  
  if(memoizedTargetRefOrQuery && !memoizedTargetRefOrQuery.__memo) {
    throw new Error(memoizedTargetRefOrQuery + ' was not properly memoized using useMemoFirebase');
  }
  return { data, isLoading, error };
}
