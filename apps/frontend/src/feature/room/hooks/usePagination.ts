import { useState } from 'react';

export function usePagination<T>(items: T[], itemsPerPage: number) {
  const [currentPage, setCurrentPage] = useState(0);

  const totalPages = Math.ceil(items.length / itemsPerPage);

  const startIndex = currentPage * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = items.slice(startIndex, endIndex);

  const goToPrevPage = () => {
    setCurrentPage((prev) => Math.max(0, prev - 1));
  };

  const goToNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1));
  };

  const hasPrevPage = currentPage > 0;
  const hasNextPage = currentPage < totalPages - 1;

  return {
    currentPage,
    currentItems,
    totalPages,
    goToPrevPage,
    goToNextPage,
    hasPrevPage,
    hasNextPage,
  };
}
