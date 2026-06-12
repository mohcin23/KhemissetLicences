export const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '?';

export const formatRelativeTime = (dateString) => {
  if (!dateString) return '';
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '? l\'instant';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  return `${days} j`;
};

export const dateInputValue = (d) => d ? new Date(d).toISOString().slice(0, 10) : '';
