/**
 * Server Store
 * Manages server nodes, groups, and routes state
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { serverApi } from '@xboard/shared/api';
import type { ServerNode, ServerGroup, ServerRoute, ServerType } from '@xboard/shared/types';

export const useServerStore = defineStore('server', () => {
  // State
  const nodes = ref<ServerNode[]>([]);
  const groups = ref<ServerGroup[]>([]);
  const routes = ref<ServerRoute[]>([]);
  const currentNode = ref<ServerNode | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Getters
  const nodesByType = computed(() => {
    const grouped: Record<ServerType, ServerNode[]> = {
      hysteria: [],
      vless: [],
      trojan: [],
      vmess: [],
      tuic: [],
      shadowsocks: [],
      anytls: [],
      socks: [],
      naive: [],
      http: [],
      mieru: [],
    };

    nodes.value.forEach((node) => {
      if (grouped[node.type]) {
        grouped[node.type].push(node);
      }
    });

    // Sort nodes within each type by sort order
    Object.keys(grouped).forEach((type) => {
      grouped[type as ServerType].sort((a, b) => (a.sort || 0) - (b.sort || 0));
    });

    return grouped;
  });

  const visibleNodes = computed(() => {
    return nodes.value.filter((node) => node.show);
  });

  const getNodeById = computed(() => {
    return (id: number) => nodes.value.find((node) => node.id === id);
  });

  const getGroupById = computed(() => {
    return (id: number) => groups.value.find((group) => group.id === id);
  });

  const getRouteById = computed(() => {
    return (id: number) => routes.value.find((route) => route.id === id);
  });

  // Actions - Server Nodes
  async function fetchNodes() {
    loading.value = true;
    error.value = null;
    try {
      const response = await serverApi.getNodes();
      nodes.value = response.data;
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch server nodes';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function saveNode(data: Partial<ServerNode>) {
    loading.value = true;
    error.value = null;
    try {
      await serverApi.saveNode(data);
      await fetchNodes(); // Refresh the list
    } catch (err: any) {
      error.value = err.message || 'Failed to save server node';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updateNodeVisibility(id: number, show: boolean) {
    loading.value = true;
    error.value = null;
    try {
      await serverApi.updateNode(id, { show });
      // Update local state
      const node = nodes.value.find((n) => n.id === id);
      if (node) {
        node.show = show;
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to update node visibility';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function deleteNode(id: number) {
    loading.value = true;
    error.value = null;
    try {
      await serverApi.deleteNode(id);
      nodes.value = nodes.value.filter((node) => node.id !== id);
    } catch (err: any) {
      error.value = err.message || 'Failed to delete server node';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function copyNode(id: number) {
    loading.value = true;
    error.value = null;
    try {
      await serverApi.copyNode(id);
      await fetchNodes(); // Refresh the list
    } catch (err: any) {
      error.value = err.message || 'Failed to copy server node';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function sortNodes(items: Array<{ id: number; order: number }>) {
    loading.value = true;
    error.value = null;
    try {
      await serverApi.sortNodes(items);
      // Update local state
      items.forEach(({ id, order }) => {
        const node = nodes.value.find((n) => n.id === id);
        if (node) {
          node.sort = order;
        }
      });
      // Re-sort the array
      nodes.value.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    } catch (err: any) {
      error.value = err.message || 'Failed to sort server nodes';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // Actions - Server Groups
  async function fetchGroups() {
    loading.value = true;
    error.value = null;
    try {
      const response = await serverApi.getGroups();
      groups.value = response.data;
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch server groups';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function saveGroup(data: { id?: number; name: string }) {
    loading.value = true;
    error.value = null;
    try {
      await serverApi.saveGroup(data);
      await fetchGroups(); // Refresh the list
    } catch (err: any) {
      error.value = err.message || 'Failed to save server group';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function deleteGroup(id: number) {
    loading.value = true;
    error.value = null;
    try {
      await serverApi.deleteGroup(id);
      groups.value = groups.value.filter((group) => group.id !== id);
    } catch (err: any) {
      error.value = err.message || 'Failed to delete server group';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // Actions - Server Routes
  async function fetchRoutes() {
    loading.value = true;
    error.value = null;
    try {
      const response = await serverApi.getRoutes();
      routes.value = response.data;
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch server routes';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function saveRoute(data: Partial<ServerRoute>) {
    loading.value = true;
    error.value = null;
    try {
      await serverApi.saveRoute(data);
      await fetchRoutes(); // Refresh the list
    } catch (err: any) {
      error.value = err.message || 'Failed to save server route';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function deleteRoute(id: number) {
    loading.value = true;
    error.value = null;
    try {
      await serverApi.deleteRoute(id);
      routes.value = routes.value.filter((route) => route.id !== id);
    } catch (err: any) {
      error.value = err.message || 'Failed to delete server route';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  function setCurrentNode(node: ServerNode | null) {
    currentNode.value = node;
  }

  function clearError() {
    error.value = null;
  }

  return {
    // State
    nodes,
    groups,
    routes,
    currentNode,
    loading,
    error,

    // Getters
    nodesByType,
    visibleNodes,
    getNodeById,
    getGroupById,
    getRouteById,

    // Actions
    fetchNodes,
    saveNode,
    updateNodeVisibility,
    deleteNode,
    copyNode,
    sortNodes,
    fetchGroups,
    saveGroup,
    deleteGroup,
    fetchRoutes,
    saveRoute,
    deleteRoute,
    setCurrentNode,
    clearError,
  };
});
