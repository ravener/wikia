const ladybug = require("ladybug-fetch");

/**
 * Options for the wikia class
 * @typedef {WikiaOptions}
 * @property {String} [wiki] - Wiki name to use leave this empty for cross-wiki.
 */

/**
 * Response object for getMinMaxWamIndexDates
 * @typedef {WamMinMaxDates}
 * @property {Date} maxDate - The Max Date.
 * @property {Date} minDate - The Min Date.
 */

/**
 * Represents a client to interact with wikia api
 * @constructor
 * @param {WikiaOptions} [options={}] - Options for the instance.
 */
class Wikia {
  constructor({ wiki } = {}) {

    /**
     * The base URL used for requests.
     * @type {String}
     */
    this.baseURL = `http://www.${wiki ? `${wiki}.` : ""}wikia.com/api/v1`;

    /**
     * The wiki name this instance was made for.
     * @type {?String}
     */
    this.wiki = wiki;

    /**
     * The instance used for doing requests.
     * @type {any}
     */
    this.request = ladybug.create({ baseURL: this.baseURL })
      .set("User-Agent", "Wikia JavaScript (https://github.com/pollen5/wikia)")
      .accept("json")
      .set("Accept-Encoding", "gzip")
      .set("Content-Type", "application/json");
  }
  
  /**
   * Search for wikis
   * @param {String} term - The Term to search.
   * @param {Object} [options] - Options for this search.
   * @param {Boolean} [options.expand=false] - Wether to request extended info.
   * @param {String} [options.hub] - The name of the vertical (e.g. Gaming, Entertainment, Lifestyle, etc.) to use as a filter
   * @param {String|Array<String>} [options.lang] - Array or comma seperated list of language codes to filter with.
   * @param {Boolean} [options.includeDomain=true] - Wether to include the wiki domain in the results.
   * @param {Number} [options.limit] - Amount to limit the results.
   * @param {Number} [options.batch] - The batch/page index to retrieve.
   * @returns {Promise<any>}
   */
  searchWikis(string, { expand, hub, lang, includeDomain = true, limit, batch } = {}) {
    const req = this.request("/Wikis/ByString")
      .query({ string, includeDomain });
    if(Array.isArray(lang)) lang = lang.join(",");
    if(hub) req.query({ hub });
    if(lang) req.query({ lang });
    if(limit) req.query({ limit });
    if(expand) req.query({ expand: 1 });
    if(batch) req.query({ batch });
    return req.then((res) => res.body);
  }
  
  /**
   * Get details of a wiki by id(s)
   * @param {String|Array<String>} - Array or comma seperated list of ids to search
   * @param {Object} [options] - Options for this request.
   * @param {Number} [options.width] - Thumbnail width in pixels.
   * @param {Number} [options.height] - Thumbnail height in pixels.
   * @param {Number} [options.snippet] - Maximum number of words returned in description.
   * @returns {Promise<any>} The returned details, in form of { id: { details } }
   */
  getDetails(ids, { width, height, snippet } = {}) {
    if(Array.isArray(ids)) ids = ids.join(",");
    const req = this.request("/Wikis/Details")
      .query({ ids });
    if(width) req.query({ width });
    if(height) req.query({ height });
    if(snippet) req.query({ snippet });
    return req.then((res) => res.body.items);
  }

  /**
   * Gets top wikis.
   * @param {Object} [options] - Options for this request.
   * @param {Boolean} [options.expand=false] - Wether to request extended details.
   * @param {Number} [options.limit] - Amount to limit the results to.
   * @param {String} [options.hub] - The name of the vertical (e.g. Gaming, Entertainment, Lifestyle, etc.) to use as a filter
   * @param {String|Array<String>} [options.lang] - Array of comma seperated list of languages to filter with.
   * @param {Number} [options.batch] - The batch/page index to retrieve.
   * @returns {Promise<Array<any>>}
   */
  getTopWikis({ expand, limit, hub, lang, batch } = {}) {
    const req = this.request("/Wikis/List");
    if(limit) req.query({ limit });
    if(hub) req.quey({ hub });
    if(Array.isArray(lang)) lang = lang.join(",");
    if(lang) req.query({ lang });
    if(batch) req.query({ batch });
    if(expand) req.query({ expand: Number(expand) });
    return req.then((res) => res.body.items);
  }

  /**
   * Query for search suggestions. (requires a wiki)
   * @param {String} query - The query to search.
   * @returns {Array<String>}
   */
  searchSuggestions(query) {
    if(!this.wiki) throw new Error("Search suggestions can only be used for a wiki not cross-wiki.");
    return this.request("/SearchSuggestions/List")
      .query({ query })
      .then((res) => (res.body.items || []).map((item) => item.title));
  }

  /**
   * Get WAM Score starting and last available dates.
   * @returns {Promise<WamMinMaxDates>}
   */
  getMinMaxWamIndexDate() {
    return this.request("/WAM/MinMaxWamIndexDate")
      .then((res) => {
        const min = res.body.min_max_dates.min_date * 1000;
        const max = res.body.min_max_dates.max_date * 1000;
        return { maxDate: new Date(max), minDate: new Date(min) };
      });
  }

  /**
   * Get language codes of the wikis that are in the WAM ranking for a given day.
   * @param {Number} [wamDay] - Unix timestamp (in seconds) of the day for the requested language code list.
   * @returns {Promise<Array<String>>}
   */
  getWamLanguages(wamDay) {
    const req = this.request("/WAM/WAMLanguages");
    // eslint-disable-next-line camelcase
    if(wamDay) req.query({ wam_day: wamDay });
    return req.then((res) => res.body.languages || []);
  }

  /**
   * Get WAM Index (list of wikis with their list of WAM ranks)
   * @param {Object} [options] - Options for this request.
   * @param {Number} [options.wamDay] - day for which the WAM scores are displayed.
   * @param {Number} [options.wamPreviousDay] - day from which the difference in WAM scores is calculated.
   * @param {Number} [options.verticalID] - vertical for which wiki list is to be pulled.
   * @param {String} [options.wikiLang] - Language code if narrowing the results to specific language.
   * @param {Number} [options.wikiID] - Id of specific wiki to pull.
   * @param {String} [options.wikiWord] - Fragment of url to search for amongst wikis.
   * @param {Boolean} [options.excludeBlacklist] - Determines if exclude blacklisted wikis (with Content Warning enabled)
   * @param {String} [options.sortColumn] - Column by which to sort.
   * @param {String} [options.sortDirection] - Sort direction.
   * @param {Number} [options.offset] - offset from the beginning of data.
   * @param {Number} [options.limit] - limit on fetched number of wikis.
   * @param {Boolean} [options.fetchAdmins] - Determines if admins of each wiki are to be returned.
   * @param {Number} [options.avatarSize] - Size of admin avatars in pixels if fetchAdmins is enabled.
   * @param {Boolean} [options.fetchWikiImages] - Determines if image of each wiki is to be returned.
   * @param {Number} [options.wikiImageWidth] - Width of wiki image in pixels if fetchWikiImages is enabled.
   * @param {Number} [options.wikiImageHeight] - Height of wiki image in pixels if fetchWikiImages is enabled. You can pass here -1 to keep aspect ratio.
   * @returns {Promise<any>}
   */
  getWamIndex({ wamDay, wamPreviousDay, verticalID, wikiLang, wikiID, wikiWord, excludeBlacklist, sortColumn, sortDirection, offset, limit, fetchAdmins, avatarSize, fetchWikiImages, wikiImageWidth, wikiImageHeight } = {}) {
    const req = this.request("/WAM/WAMIndex");
    /* eslint-disable camelcase */
    if(wamDay) req.query({ wam_day: wamDay });
    if(wamPreviousDay) req.query({ wam_previous_day: wamPreviousDay });
    if(verticalID) req.query({ veritical_id: verticalID });
    if(wikiLang) req.query({ wiki_lang: wikiLang });
    if(wikiID) req.query({ wiki_id: wikiID });
    if(wikiWord) req.query({ wiki_word: wikiWord });
    if(excludeBlacklist) req.query({ exclude_blacklist: excludeBlacklist });
    if(sortColumn) req.query({ sort_column: sortColumn });
    if(sortDirection) req.query({ sort_direction: sortDirection });
    if(offset) req.query({ offset });
    if(limit) req.query({ limit });
    if(typeof fetchAdmins !== "undefined") req.query({ fetch_admins: fetchAdmins });
    if(avatarSize) req.query({ avatar_size: avatarSize });
    if(typeof fetchWikiImages !== "undefined") req.query({ fetch_wiki_images: fetchWikiImages });
    if(wikiImageWidth) req.query({ wiki_image_width: wikiImageWidth });
    if(wikiImageHeight) req.query({ wiki_image_height: wikiImageHeight });
    /* eslint-enable camelcase */
    return req.then((res) => res.body);
  }

  /**
   * Get details about selected users.
   * @param {String|Array<String>} ids - Array or Comma-separated list of user ids. Maximum size of id list is 100.
   * @param {Object} [options] - Options for this request.
   * @param {Number} [options.size=100] - The desired width (and height, because it is a square) for the thumbnail, defaults to 100, 0 for no thumbnail
   * @returns {Promise<Array<any>>}
   */
  getUsers(ids, { size } = {}) {
    if(Array.isArray(ids)) ids = ids.join(",");
    const req = this.request("/User/Details");
    if(typeof size !== "undefined") req.query({ size });
    return req.then((res) => res.body);
  }

  /**
   * Get pages related to a given article ID.
   * @param {String|Array<String>} ids - Array or comma seperated list of article ids
   * @param {Object} [options] - Options for the request.
   * @param {Number} [options.limit] - Limit the returned results.
   * @returns {Promise<any>}
   */
  getRelatedArticles(ids, { limit }) {
    if(Array.isArray(ids)) ids = ids.join(",");
    const req = this.request("/RelatedPages/List")
      .query({ ids });
    if(limit) req.query({ limit });
    return req.then((res) => res.body);  
  }

  /**
   * Get wiki navigation links (the main menu of given wiki)
   * @returns {Promise<any>}
   */
  getNavigation() {
    return this.request("/Navigation/Data")
      .then((res) => res.body.navigation);
  }

  /**
   * Get wiki data, including key values, navigation data, and more.
   * @returns {Promise<any>}
   */
  getWikiData() {
    return this.request("/Mercury/WikiVariables")
      .then((res) => res.body);
  }

  /**
   * Get latest activity information.
   * @param {Object} [options] - Options for this request.
   * @param {Number} [options.limit] - Limit the number of results.
   * @param {String|Array<String>} [options.namespaces] - Array or Comma-separated namespace ids, see more: http://community.wikia.com/wiki/Help:Namespaces
   * @param {Boolean} [options.allowDuplicates=true] - Set if duplicate values of an article's revisions made by the same user are not allowed.
   * @returns {Promise<Array<any>>}
   */
  getLatestActivity({ limit, namespaces, allowDuplicates } = {}) {
    const req = this.request("/Activity/LatestActivity");
    if(limit) req.query({ limit });
    if(Array.isArray(namespaces)) namespaces = namespaces.join(",");
    if(namespaces) req.query({ namespaces });
    if(typeof allowDuplicates !== "undefined") req.query({ allowDuplicates });
    return req.then((res) => res.body.items);
  }

  /**
   * Get recently changes articles.
   * @param {Object} [options] - Options for this request.
   * @param {Number} [options.limit] - Limit the number of results.
   * @param {String|Array<String>} [options.namespaces] - Array or Comma-separated namespace ids, see more: http://community.wikia.com/wiki/Help:Namespaces
   * @param {Boolean} [options.allowDuplicates=true] - Set if duplicate values of an article's revisions made by the same user are not allowed.
   * @returns {Promise<Array<any>>}
  */
  getRecentlyChangedArticles({ limit, namespaces, allowDuplicates } = {}) {
    if(Array.isArray(namespaces)) namespaces = namespaces.join(",");
    const req = this.request("/Activity/RecentlyChangedArticles");
    if(limit) req.query({ limit });
    if(namespaces) req.query({ namespaces });
    if(typeof allowDuplicates !== "undefined") req.query({ allowDuplicates });
    return req.then((res) => res.body.items);
  }

  /**
   * Get results for combined (wiki and cross-wiki) search.
   * @param {String} query - Search query.
   * @param {Object} [options] - Options for this search.
   * @param {String|Array<String>} [options.langs] - Array or Comma separated language codes (e.g. en,de,fr)
   * @param {String|Array<String>} [options.hubs] - Array or Comma-separated list of verticals (e.g. Gaming, Entertainment, Lifestyle)
   * @param {String|Array<String>} [options.namespaces] - Array or Comma-separated namespace ids, see more: http://community.wikia.com/wiki/Help:Namespaces
   * @param {Number} [options.limit] - Will limit number of articles returned to given number.
   * @param {Number} [options.minArticleQuality] - Minimal value of article quality. Ranges from 0 to 99.
   * @returns {Promise<any>}
   */
  searchCombined(query, { langs, hubs, namespaces, limit, minArticleQuality } = {}) {
    const req = this.request("/Search/Combined")
      .query({ query });
    if(Array.isArray(langs)) langs = langs.join(",");
    if(Array.isArray(hubs)) hubs = hubs.join(",");
    if(Array.isArray(namespaces)) namespaces = namespaces.join(",");
    if(langs) req.query({ langs });
    if(hubs) req.query({ hubs });
    if(namespaces) req.query({ namespaces });
    if(limit) req.query({ limit });
    if(typeof minArticleQuality !== "undefined") req.query({ minArticleQuality });
    return req.then((res) => res.body);
  }

  /**
   * Get results for cross-wiki search.
   * @param {String} query - Search query.
   * @param {Object} [options] - Options for this request.
   * @param {String|Array<String>} [options.hub] - Array or Comma-separated list of verticals (e.g. Gaming, Entertainment, Lifestyle)
   * @param {String|Array<String>} [options.lang] - Array or Comma separated language codes (e.g. en,de,fr)
   * @param {String} [options.rank] - The ranking to use in fetching the list of results, one of default, newest, oldest, recently-modified, stable, most-viewed, freshest, stalest.
   * @param {Number} [options.limit] - Limit the number of results.
   * @param {Number} [options.batch] - The batch (page) of results to fetch.
   * @returns {Promise<any>}
   * @param {Boolean} [options.expand] - Wether to request extended details. (always true if a wiki is provided on the instance.)
   * @param {Number} [options.height] - The desired height for the thumbnail. (only used if expand is true)
   * @param {Number} [options.width] - The desired width for the thumbnail. (only used if expand is true)
   * @param {Number} [options.snippet] - Maximum number of words returned in description. (only used if expand is true)
   */
  searchCrossWiki(query, { expand = Boolean(this.wiki), hub, lang, rank, limit, batch, height, width, snippet } = {}) {
    const req = this.request("/Search/CrossWiki")
      .query({ query });
    if(Array.isArray(hub)) hub = hub.join(",");
    if(Array.isArray(lang)) lang = lang.join(",");
    if(hub) req.query({ hub });
    if(lang) req.query({ lang });
    if(rank) req.query({ rank });
    if(limit) req.query({ limit });
    if(batch) req.query({ batch });
    if(expand) req.query({ expand });
    if(expand && width) req.query({ width });
    if(expand && height) req.query({ height });
    if(expand && snippet) req.query({ snippet });
    return req.then((res) => res.body);
  }

  /**
   * Do search for a given phrase. (only available if a wiki is provided on the instance.)
   * @param {String} query - Search query.
   * @param {Object} [options] - Options for this search.
   * @param {String} [options.type=articles] - The search type, either articles (default) or videos. For 'videos' value, this parameter should be used with namespaces parameter (namespaces needs to be set to 6)
   * @param {String} [options.rank] - The ranking to use in fetching the list of results, one of default, newest, oldest, recently-modified, stable, most-viewed, freshest, stalest
   * @param {Number} [options.limit] - Limit the number of results.
   * @param {Number} [options.minArticleQuality] - Minimal value of article quality. Ranges from 0 to 99.
   * @param {Number} [options.batch] - The batch (page) of results to fetch.
   * @param {String} [options.namespaces] - Page namespace number, see more: http://community.wikia.com/wiki/Help:Namespaces
   */
  search(query, { type, rank, limit, minArticleQuality, batch, namespaces } = {}) {
    if(!this.wiki) throw new Error("search() is only available if a wiki is provided.");
    const req = this.request("/Search/List")
      .query({ query });
    if(type) req.query({ type });
    if(rank) req.query({ rank });
    if(limit) req.query({ limit });
    if(typeof minArticleQuality !== "undefined") req.query({ minArticleQuality });
    if(batch) req.query({ batch });
    if(namespaces) req.query({ namespaces });
    return req.then((res) => res.body);
  }

  /**
   * Get a simplified article with an ID.
   * @param {Number|String} id - Article ID to get.
   * @returns {Promise<Array<any>>} Article data
   */
  getSimplifiedArticle(id) {
    return this.request("/Articles/AsSimpleJson")
      .query({ id })
      .then((res) => res.body.sections);
  }

  /**
   * Get details about one or more articles.
   * @param {String|Array<String>} ids - Array or Comma-separated list of article ids.
   * @param {Object} [options] - Extra options to customize the response.
   * @param {String|Array<String>} [options.titles] - Titles with underscores instead of spaces, Array or comma-separated.
   * @param {Number} [options.abstract] - The desired length for the article's abstract.
   * @param {Number} [options.width] - The desired width for the thumbnail.
   * @param {Number} [options.height] - The desired height for the thumbnail.
   * @returns {Promise<any>} Article(s) details.
   */
  getArticleDetails(ids, { titles, abstract, width, height } = {}) {
    if(Array.isArray(ids)) ids = ids.join(",");
    if(Array.isArray(titles)) titles = titles.join(",");
    const req = this.request("/Articles/Details")
      .query({ ids });
    if(titles) req.query({ titles });
    if(abstract) req.query({ abstract });
    if(width) req.query({ width });
    if(height) req.query({ height });
    return req.then((res) => res.body);
  }

  /**
   * Get articles list in alphabetical order.
   * @param {Object} [options] - Options to customize the response.
   * @param {String} [options.category] - Return only articles belonging to the provided valid category title.
   * @param {String|Array<String>} [options.namespaces] - Array or Comma-separated namespace ids, see more: http://community.wikia.com/wiki/Help:Namespaces.
   * @param {Number} [options.limit] - Limit the number of results.
   * @param {String} [options.offset] - Lexicographically minimal article title.
   * @param {Boolean} [options.expand=false] - Wether to request expanded data.
   * @returns {Promise<any>}
   */
  getArticlesList({ category, namespaces, limit, offset, expand = false } = {}) {
    if(Array.isArray(namespaces)) namespaces = namespaces.join(",");
    const req = this.request("/Articles/List");
    if(category) req.query({ category });
    if(namespaces) req.query({ namespaces });
    if(limit) req.query({ limit });
    if(offset) req.query({ offset });
    if(expand) req.query({ expand: 1 });
    return req.then((res) => res.body);
  }

  /**
   * Get the most linked articles on this wiki.
   * @param {Object} [options] - Options for customizing response.
   * @param {Boolean} [options.expand=false] - Wether to request expanded data.
   * @returns {Promise<any>}
   */
  getMostLinkedArtices({ expand = false } = {}) {
    const req = this.request("/Articles/MostLinked");
    if(expand) req.query({ expand: 1 });
    return req.then((res) => res.body);
  }

  /**
   * Get list of new articles on this wiki. (requires a wiki to be set.)
   * @param {Object} [options] - Options for customizing the response.
   * @param {String|Array<String>} [options.namespaces] - Array or Comma-separated namespace ids, see more: http://community.wikia.com/wiki/Help:Namespaces
   * @param {Number} [options.limit] - Limit the number of result - maximum limit is 100.
   * @param {Number} [options.minArticleQuality] - Minimal value of article quality. Ranges from 0 to 99.
   * @returns {Promise<any>} Articles data.
   */
  getNewArticles({ namespaces, limit, minArticleQuality } = {}) {
    if(!this.wiki) throw new Error("A wiki must be set to use this method.");
    if(Array.isArray(namespaces)) namespaces = namespaces.join(",");
    const req = this.request("/Articles/New");
    if(namespaces) req.query({ namespaces });
    if(limit) req.query({ limit });
    if(typeof minArticleQuality !== "undefined") req.query({ minArticleQuality });
    return req.then((res) => res.body);
  }

  /**
   * Get popular articles for the current wiki (from the beginning of time)
   * @param {Object} [options] - Options for customizing the response.
   * @param {Number} [options.limit] - Limit the number of result - maximum limit is 10.
   * @param {Number} [options.baseArticleId] - Trending and popular related to article with given id.
   * @param {Boolean} [options.expand] - Wether to request expanded data.
   * @returns {Promise<any>}
   */
  getPopularArticles({ limit, baseArticleId, expand = false } = {}) {
    const req = this.request("/Articles/Popular");
    if(limit) req.query({ limit });
    if(baseArticleId) req.query({ baseArticleId });
    if(expand) req.query({ expand: 1 });
    return req.then((res) => res.body);
  }

  /**
   * Get the most viewed articles on this wiki.
   * @param {Object} [options] - Options for customizing the response.
   * @param {String|Array<String>} [options.namespaces] - Array or Comma-separated namespace ids, see more: http://community.wikia.com/wiki/Help:Namespaces
   * @param {Number} [options.limit] - Limit the number of result - maximum limit is 250.
   * @param {Number} [options.baseArticleId] - Trending and popular related to article with given id.
   * @param {Boolean} [options.expand=false] - Wether to request expanded data.
   * @returns {Promise<any>} - Article(s) Data.
   */
  getTopArticles({ namespaces, limit, baseArticleId, expand = false } = {}) {
    if(Array.isArray(namespaces)) namespaces = namespaces.join(",");
    const req = this.request("/Articles/Top");
    if(namespaces) req.query({ namespaces });
    if(limit) req.query({ limit });
    if(baseArticleId) req.query({ baseArticleId });
    if(expand) req.query({ expand: 1 });
    return req.then((res) => res.body);
  }

  /**
   * Get the top articles by pageviews for a hub.
   * @param {String} hub - The name of the vertical (e.g. Gaming)
   * @param {Object} [options] - Options for customizing the response.
   * @param {String|Array<String>} [options.lang] - Array or Comma separated language codes (e.g. en,de,fr)
   * @param {String|Array<String>} [options.namespaces] - Comma-separated namespace ids, see more: http://community.wikia.com/wiki/Help:Namespaces
   * @returns {Promise<Array<any>>} Articles data.
   */
  getTopArticlesByHub(hub, { lang, namespaces } = {}) {
    if(Array.isArray(namespaces)) namespaces = namespaces.join(",");
    if(Array.isArray(lang)) lang = lang.join(",");
    const req = this.request("/Articles/TopByHub");
    if(lang) req.query({ lang });
    if(namespaces) req.query({ namespaces });
    return req.then((res) => res.body.items);
  }
}

Wikia.version = require("../package.json").version;

module.exports = Wikia;
