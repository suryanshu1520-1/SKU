/**
 * src/components/radar/useRadarV2.ts
 *
 * React hooks for Radar API v2 data consumption:
 * - useDispatchLineage(id?: string)
 * - useNodeSignal(nodeId?: string)
 * - useAuthority(slugs?: string[])
 * Returns undefined while loading, null when absent.
 * TASK_085Q2
 */

import { useState, useEffect } from "react";
import {
  getDispatchLineage,
  getNodeSignal,
  getFirstAuthority,
  type DispatchLineage,
  type NodeSignalClient,
  type AuthorityClient,
} from "../../lib/radar-v2-client.ts";

export function useDispatchLineage(id?: string): DispatchLineage | null | undefined {
  const [lineage, setLineage] = useState<DispatchLineage | null | undefined>(undefined);

  useEffect(() => {
    if (!id) {
      setLineage(null);
      return;
    }

    let isMounted = true;
    getDispatchLineage(id)
      .then((res) => {
        if (isMounted) setLineage(res);
      })
      .catch(() => {
        if (isMounted) setLineage(null);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  return lineage;
}

export function useNodeSignal(nodeId?: string): NodeSignalClient | null | undefined {
  const [signal, setSignal] = useState<NodeSignalClient | null | undefined>(undefined);

  useEffect(() => {
    if (!nodeId) {
      setSignal(null);
      return;
    }

    let isMounted = true;
    getNodeSignal(nodeId)
      .then((res) => {
        if (isMounted) setSignal(res);
      })
      .catch(() => {
        if (isMounted) setSignal(null);
      });

    return () => {
      isMounted = false;
    };
  }, [nodeId]);

  return signal;
}

export function useAuthority(slugs?: string[]): AuthorityClient | null | undefined {
  const [authority, setAuthority] = useState<AuthorityClient | null | undefined>(undefined);
  const key = slugs ? slugs.join(",") : "";

  useEffect(() => {
    if (!slugs || slugs.length === 0) {
      setAuthority(null);
      return;
    }

    let isMounted = true;
    getFirstAuthority(slugs)
      .then((res) => {
        if (isMounted) setAuthority(res);
      })
      .catch(() => {
        if (isMounted) setAuthority(null);
      });

    return () => {
      isMounted = false;
    };
  }, [key]);

  return authority;
}
