import {
  addMovie,
  editMovie,
  removeMovie,
  listAllGenres,
  addGenre,
  removeGenre,
  listAllTheatres,
  addTheatre,
  editTheatre,
  removeTheatre,
  addScreenWithSeats,
  getScreenDetails,
  listSeatCategories,
  addSeatCategory,
  editSeatCategory,
  addShow,
  editShow,
  removeShow,
} from '../services/adminCatalogService.js';

// --- Movies ---
export async function createMovie(req, res, next) {
  try {
    const movie = await addMovie(req.body, req.user.id);
    return res.status(201).json({ message: 'Movie created successfully', data: movie });
  } catch (err) {
    return next(err);
  }
}

export async function updateMovie(req, res, next) {
  try {
    const movie = await editMovie(req.params.id, req.body, req.user.id);
    return res.status(200).json({ message: 'Movie updated successfully', data: movie });
  } catch (err) {
    return next(err);
  }
}

export async function deleteMovie(req, res, next) {
  try {
    const result = await removeMovie(req.params.id, req.user.id);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

// --- Genres ---
export async function getGenres(req, res, next) {
  try {
    const genres = await listAllGenres();
    return res.status(200).json({ data: genres });
  } catch (err) {
    return next(err);
  }
}

export async function createGenre(req, res, next) {
  try {
    const genre = await addGenre(req.body.name, req.user.id);
    return res.status(201).json({ message: 'Genre created successfully', data: genre });
  } catch (err) {
    return next(err);
  }
}

export async function deleteGenre(req, res, next) {
  try {
    const result = await removeGenre(req.params.id, req.user.id);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

// --- Theatres ---
export async function getTheatres(req, res, next) {
  try {
    const theatres = await listAllTheatres();
    return res.status(200).json({ data: theatres });
  } catch (err) {
    return next(err);
  }
}

export async function createTheatre(req, res, next) {
  try {
    const theatre = await addTheatre(req.body, req.user.id);
    return res.status(201).json({ message: 'Theatre created successfully', data: theatre });
  } catch (err) {
    return next(err);
  }
}

export async function updateTheatre(req, res, next) {
  try {
    const theatre = await editTheatre(req.params.id, req.body, req.user.id);
    return res.status(200).json({ message: 'Theatre updated successfully', data: theatre });
  } catch (err) {
    return next(err);
  }
}

export async function deleteTheatre(req, res, next) {
  try {
    const result = await removeTheatre(req.params.id, req.user.id);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

// --- Screens ---
export async function createScreen(req, res, next) {
  try {
    const screen = await addScreenWithSeats(req.body, req.user.id);
    return res.status(201).json({ message: 'Screen and seats created successfully', data: screen });
  } catch (err) {
    return next(err);
  }
}

export async function getScreen(req, res, next) {
  try {
    const screen = await getScreenDetails(req.params.id);
    return res.status(200).json({ data: screen });
  } catch (err) {
    return next(err);
  }
}

// --- Seat Categories ---
export async function getSeatCategories(req, res, next) {
  try {
    const categories = await listSeatCategories();
    return res.status(200).json({ data: categories });
  } catch (err) {
    return next(err);
  }
}

export async function createSeatCategory(req, res, next) {
  try {
    const category = await addSeatCategory(req.body, req.user.id);
    return res.status(201).json({ message: 'Seat category created successfully', data: category });
  } catch (err) {
    return next(err);
  }
}

export async function updateSeatCategory(req, res, next) {
  try {
    const category = await editSeatCategory(req.params.id, req.body, req.user.id);
    return res.status(200).json({ message: 'Seat category updated successfully', data: category });
  } catch (err) {
    return next(err);
  }
}

// --- Shows ---
export async function createShow(req, res, next) {
  try {
    const show = await addShow(req.body, req.user.id);
    return res.status(201).json({ message: 'Show scheduled successfully', data: show });
  } catch (err) {
    return next(err);
  }
}

export async function updateShow(req, res, next) {
  try {
    const show = await editShow(req.params.id, req.body, req.user.id);
    return res.status(200).json({ message: 'Show updated successfully', data: show });
  } catch (err) {
    return next(err);
  }
}

export async function deleteShow(req, res, next) {
  try {
    const result = await removeShow(req.params.id, req.user.id);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}
