/**
 * Build pagination metadata and apply skip/limit to a Mongoose query.
 *
 * Usage:
 *   const { data, pagination } = await paginate(Restaurant.find({ isOpen: true }), { page: 2, limit: 20 });
 *
 * @param {import('mongoose').Query} query - A Mongoose query (NOT yet executed)
 * @param {Object} options
 * @param {number} options.page - Current page (1-indexed, default 1)
 * @param {number} options.limit - Items per page (default 20, max 100)
 * @returns {Promise<{ data: Array, pagination: Object }>}
 */
const paginate = async (query, { page = 1, limit = 20 } = {}) => {
  page = Math.max(1, Number(page));
  limit = Math.min(100, Math.max(1, Number(limit)));

  const skip = (page - 1) * limit;

  // Clone the query for counting (can't reuse after exec)
  const countQuery = query.model.find(query.getFilter());
  const [data, totalItems] = await Promise.all([
    query.skip(skip).limit(limit).exec(),
    countQuery.countDocuments(),
  ]);

  const totalPages = Math.ceil(totalItems / limit);

  return {
    data,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

export default paginate;
