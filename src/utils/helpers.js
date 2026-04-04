export const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

export const truncateContent = (content, length = 100) => {
  if (content?.length <= length) return content;
  return content?.substring(0, length) + '...';
};

export default { formatDate, truncateContent };
