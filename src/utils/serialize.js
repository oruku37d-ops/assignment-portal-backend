const serialize = (doc) => {
  if (!doc) return doc;
  if (Array.isArray(doc)) return doc.map(serialize);
  return doc.toJSON ? doc.toJSON() : doc;
};

module.exports = { serialize };
