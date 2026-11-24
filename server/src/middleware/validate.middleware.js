/**
 * Reusable Zod validation middleware.
 *
 * Usage:
 *   router.post('/', validate(createIssueSchema), controller.createIssue);
 *   router.get('/', validate(listQuerySchema, 'query'), controller.listIssues);
 *
 * Parsed values are stored on req.validated[source]. The body is also replaced
 * with the parsed result so controllers always receive coerced, safe data.
 */
export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    try {
      const parsed = schema.parse(req[source] ?? {});
      req.validated = { ...(req.validated ?? {}), [source]: parsed };

      if (source === 'body') {
        req.body = parsed;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
