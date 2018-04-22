const _ = require('lodash')

const cache = _require('libs/lowdb')
const logger = _require('libs/Logger')
const { normalizeRepos } = _require('libs/GitHub/webhooks/transformer')

const createInstallationOnCache = async (installation, repos) => {
  logger.verbose('Creating installation on lowdb Cache')

  let flattenedRepos = _.keyBy(normalizeRepos(repos, installation.id), 'id')

  try {
    let db = await cache()

    db
      .set(`installations[${installation.id}]`, {
        installation,
        repositories: _.keyBy(repos, 'id')
      })
      .write()

    db
      .get('repositories')
      .extend(flattenedRepos)
      .write()

    return true
  } catch (err) {
    throw err
  }
}

const deleteInstallationFromCache = async (installation, repos) => {
  logger.verbose('Deleting installation from lowdb Cache')

  try {
    let db = await cache()

    let repoIds = db
      .get(`installations[${installation.id}].repositories`)
      .keys()
      .value()

    repoIds.forEach(repoId => {
      db
        .get('repositories')
        .unset(repoId)
        .write()
    })

    db
      .get(`installations`)
      .unset(installation.id)
      .write()

    return true
  } catch (err) {
    throw err
  }
}

const addReposToCache = async (installation, repos) => {
  logger.verbose('Adding repositories to lowdb Cache')

  try {
    let db = await cache()

    db
      .get(`installations[${installation.id}].repositories`)
      .extend(_.keyBy(repos, 'id'))
      .write()

    db
      .get('repositories')
      .extend(_.keyBy(normalizeRepos(repos, installation.id), 'id'))
      .write()

    return true
  } catch (err) {
    throw err
  }
}

const removeReposFromCache = async (installation, repos) => {
  logger.verbose('Removing repositories from lowdb Cache')

  let repoIDs = _.map(repos, 'id')

  try {
    let db = await cache()

    repoIDs.forEach(repoID => {
      db
        .get(`installations[${installation.id}].repositories`)
        .unset(repoID)
        .write()

      db
        .get('repositories')
        .unset(repoID)
        .write()
    })

    return true
  } catch (err) {
    throw err
  }
}

const fetchInstallationIdFromCache = async ({ username, repository }) => {
  logger.verbose('Fetching installation_id from lowdb Cache')

  try {
    let db = await cache()

    let id =
      db
        .get('repositories')
        .find({ full_name: `${username}/${repository}` })
        .get('installation_id')
        .value() || null

    return id
  } catch (err) {
    throw err
  }
}

const addRepoToCache = async ({ installation_id, ...repo }) => {
  logger.info('Adding repository to lowdb Cache')

  try {
    let db = await cache()

    if (!db.has(`installations[${installation_id}]`).value()) {
      db
        .set(`installations[${installation_id}]`, {
          installation: { id: installation_id, account: {} },
          repositories: {}
        })
        .write()
    }

    db
      .get(`installations[${installation_id}]`)
      .set(`repositories[${repo.id}]`, repo)
      .write()

    db
      .get('repositories')
      .set(repo.id, { ...repo, installation_id })
      .write()
  } catch (err) {
    throw err
  }
}

module.exports = {
  createInstallationOnCache,
  deleteInstallationFromCache,
  addReposToCache,
  removeReposFromCache,
  fetchInstallationIdFromCache,
  addRepoToCache
}