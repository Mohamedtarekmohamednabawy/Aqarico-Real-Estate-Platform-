import Property from "../models/Property.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import axios from "axios";
import { escapeRegex } from '../utils/regexUtils.js';

// Amenities mapping: frontend label → model field name
const amenitiesMap = {
  Furnished: "furnished",
  Elevator: "elevator",
  Security: "security",
  "Natural Gas": "naturalGas",
  "Electricity Meter": "electricityMeter",
  "Water Meter": "waterMeter",
};

/**
 * @desc    Get all properties with filters, pagination, sorting
 * @route   GET /api/properties
 * @access  Public
 */
export const getProperties = async (req, res, next) => {
  try {
    const {
      type,
      location,
      category,
      minPrice,
      maxPrice,
      minArea,
      maxArea,
      bedrooms,
      bathrooms,
      minBedrooms,
      maxBedrooms,
      minBathrooms,
      maxBathrooms,
      minFloor,
      maxFloor,
      minYearBuilt,
      maxYearBuilt,
      isVerified,
      isFeatured,
      district,
      amenities,
      searchQuery,
      page = 1,
      limit = 12,
      sortBy = "createdAt",
      sortOrder = "desc",
      owner,
    } = req.query;

    console.log(`\n[PROPERTY DEBUG] Fetching properties — Type: ${type || 'all'}, Location: ${location || 'all'}, Page: ${page}`);

    // Build filter object
    const filter = {};

    if (type) filter.type = type;
    if (location && location !== "All Locations") filter.location = location;
    if (category && category !== "All") filter.category = category;
    if (district && district !== "All") filter.district = district;
    if (isVerified !== undefined) filter.isVerified = isVerified === "true";
    if (isFeatured !== undefined) filter.isFeatured = isFeatured === "true";
    if (owner) filter.owner = owner;

    // Exact bedrooms/bathrooms (backward compatible)
    if (bedrooms) filter.bedrooms = Number(bedrooms);
    if (bathrooms) filter.bathrooms = Number(bathrooms);

    // Bedroom range
    if (minBedrooms || maxBedrooms) {
      filter.bedrooms = filter.bedrooms || {};
      if (minBedrooms && Number(minBedrooms) > 0)
        filter.bedrooms.$gte = Number(minBedrooms);
      if (maxBedrooms && Number(maxBedrooms) < 10)
        filter.bedrooms.$lte = Number(maxBedrooms);
      // If no constraints were actually set, remove the empty object
      if (Object.keys(filter.bedrooms).length === 0) delete filter.bedrooms;
    }

    // Bathroom range
    if (minBathrooms || maxBathrooms) {
      filter.bathrooms = filter.bathrooms || {};
      if (minBathrooms && Number(minBathrooms) > 0)
        filter.bathrooms.$gte = Number(minBathrooms);
      if (maxBathrooms && Number(maxBathrooms) < 10)
        filter.bathrooms.$lte = Number(maxBathrooms);
      if (Object.keys(filter.bathrooms).length === 0) delete filter.bathrooms;
    }

    // Floor range
    if (minFloor || maxFloor) {
      filter.floor = filter.floor || {};
      if (minFloor && Number(minFloor) >= 0)
        filter.floor.$gte = Number(minFloor);
      if (maxFloor && Number(maxFloor) <= 50)
        filter.floor.$lte = Number(maxFloor);
      if (Object.keys(filter.floor).length === 0) delete filter.floor;
    }

    // Year Built range
    if (minYearBuilt || maxYearBuilt) {
      filter.yearBuilt = filter.yearBuilt || {};
      if (minYearBuilt && Number(minYearBuilt) >= 1900)
        filter.yearBuilt.$gte = Number(minYearBuilt);
      if (maxYearBuilt && Number(maxYearBuilt) <= new Date().getFullYear() + 10)
        filter.yearBuilt.$lte = Number(maxYearBuilt);
      if (Object.keys(filter.yearBuilt).length === 0) delete filter.yearBuilt;
    }

    // Price range
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    // Coordinates bounding box filter (Radius search)
    const { lat, lng, radiusKm } = req.query;
    if (lat && lng && radiusKm) {
      const latNum = Number(lat);
      const lngNum = Number(lng);
      const radNum = Number(radiusKm);
      // Rough approximation: 1 deg lat = 111km, 1 deg lng at 31 deg = ~95km
      const latDelta = radNum / 111;
      const lngDelta = radNum / (111 * Math.cos((latNum * Math.PI) / 180));
      filter["coordinates.lat"] = {
        $gte: latNum - latDelta,
        $lte: latNum + latDelta,
      };
      filter["coordinates.lng"] = {
        $gte: lngNum - lngDelta,
        $lte: lngNum + lngDelta,
      };
    }

    // Area range
    if (minArea || maxArea) {
      filter.area = {};
      if (minArea && Number(minArea) > 0) filter.area.$gte = Number(minArea);
      if (maxArea && Number(maxArea) < 1000) filter.area.$lte = Number(maxArea);
      if (Object.keys(filter.area).length === 0) delete filter.area;
    }

    // Amenities filtering (e.g., amenities=Furnished,Elevator,Security)
    if (amenities) {
      const amenityList = (
        Array.isArray(amenities) ? amenities : amenities.split(",")
      )
        .map((a) => a.trim())
        .filter(Boolean);

      const amenityFilters = amenityList.map((amenity) => {
        const field = amenitiesMap[amenity];
        const amenityNameMatch = {
          amenities: { $regex: new RegExp(`^${escapeRegex(amenity)}$`, "i") },
        };

        return field
          ? { $or: [{ [field]: 1 }, amenityNameMatch] }
          : amenityNameMatch;
      });

      if (amenityFilters.length > 0) {
        filter.$and = [...(filter.$and || []), ...amenityFilters];
      }
    }

    // Text search (search in title, description, location, or owner name/email)
    if (searchQuery) {
      const escapedQuery = escapeRegex(searchQuery);
      filter.$or = [
        { title: { $regex: escapedQuery, $options: "i" } },
        { description: { $regex: escapedQuery, $options: "i" } },
        { location: { $regex: escapedQuery, $options: "i" } },
        { district: { $regex: escapedQuery, $options: "i" } },
      ];
    }

    let sortObj = {};

    switch (sortBy) {
      case "price-low":
        sortObj.price = 1;
        break;
      case "price-high":
        sortObj.price = -1;
        break;
      case "area-small":
        sortObj.area = 1;
        break;
      case "area-large":
        sortObj.area = -1;
        break;
      case "nearby":
        // Geographical proximity search doesn't enforce featured/verified buckets
        // to ensure the strictly closest items are returned.
        sortObj.createdAt = -1;
        break;
      case "newest":
      case "createdAt":
      case "default":
        sortObj.isFeatured = -1;
        sortObj.isVerified = -1;
        sortObj.createdAt = -1;
        break;
      case "most-viewed":
        sortObj.views = -1;
        break;
      default:
        sortObj.isFeatured = -1;
        sortObj.isVerified = -1;
        sortObj[sortBy] = sortOrder === "asc" ? 1 : -1;
    }

    // Pagination
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [properties, total] = await Promise.all([
      Property.find(filter)
        .populate("owner", "firstName lastName email avatar")
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum),
      Property.countDocuments(filter),
    ]);

    // Self-healing: if admin deleted user directly from DB, owner will be null.
    // We filter them out and asynchronously delete them to clean the database.
    const validProperties = [];
    const orphanedIds = [];

    properties.forEach((prop) => {
      if (!prop.owner) {
        orphanedIds.push(prop._id);
      } else {
        validProperties.push(prop);
      }
    });

    if (orphanedIds.length > 0) {
      Property.deleteMany({ _id: { $in: orphanedIds } }).catch((err) =>
        console.error("Failed to delete orphaned properties:", err),
      );
    }

    res.json({
      success: true,
      data: validProperties,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: total - orphanedIds.length,
        pages: Math.ceil((total - orphanedIds.length) / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get logged-in user's own listings
 * @route   GET /api/properties/my
 * @access  Private
 */
export const getMyProperties = async (req, res, next) => {
  try {
    const properties = await Property.find({ owner: req.user._id }).sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      data: properties,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get lightweight map pin data
 * @route   GET /api/properties/map/pins
 * @access  Public
 */
export const getMapPins = async (req, res, next) => {
  try {
    const pins = await Property.find(
      { coordinates: { $exists: true } },
      { _id: 1, coordinates: 1, price: 1, type: 1, status: 1, title: 1 },
    );

    res.json({
      success: true,
      data: pins,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single property by ID, auto-increment views
 * @route   GET /api/properties/:id
 * @access  Public
 */
export const getProperty = async (req, res, next) => {
  try {
    const propertyId = req.params.id;
    const viewerId = req.user ? req.user._id.toString() : req.ip;

    // Atomically update views and tracking array
    const propertyUpdate = await Property.findByIdAndUpdate(
      propertyId,
      {
        $addToSet: { viewedBy: viewerId },
        $inc: { views: 0 } // dummy inc to facilitate return
      },
      { new: false } // return old doc to see if viewer was already there
    );

    if (!propertyUpdate) {
      return res.status(404).json({ success: false, message: "Property not found" });
    }

    // If viewerId wasn't already in viewedBy, increment views counter
    if (!propertyUpdate.viewedBy.includes(viewerId)) {
      await Property.findByIdAndUpdate(propertyId, { $inc: { views: 1 } });
    }

    const populatedProperty = await Property.findById(propertyId)
      .populate("owner", "firstName lastName email avatar phone")
      .populate("agent", "name phone avatar");

    res.json({
      success: true,
      data: populatedProperty,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new property listing
 * @route   POST /api/properties
 * @access  Private (seller, agent, agency, developer, admin)
 */
export const createProperty = async (req, res, next) => {
  try {
    const {
      title,
      description,
      price,
      location,
      type,
      category,
      area,
      bedrooms,
      bathrooms,
      amenities,
      coordinates,
      district,
      finish,
      yearBuilt,
      floor,
      levelWarning,
    } = req.body;

    console.log(`\n[PROPERTY DEBUG] Creating new listing — Title: ${title}, Owner: ${req.user?._id}, Type: ${type}`);

    // Build property data
    const propertyData = {
      title,
      description,
      price: Number(price),
      location,
      type,
      category,
      area: Number(area),
      bedrooms: Number(bedrooms),
      bathrooms: Number(bathrooms),
      owner: req.user._id,
      district,
      finish,
      yearBuilt: yearBuilt ? Number(yearBuilt) : undefined,
      floor: floor ? Number(floor) : 0,
    };

    if (levelWarning !== undefined) {
      const level = Number(levelWarning);
      if (level >= 3) {
        propertyData.isVerified = false;
        propertyData.isFairPrice = false;
      } else {
        propertyData.isVerified = true;
        propertyData.isFairPrice = true;
      }
    } else {
      propertyData.isVerified = false;
    }

    // Parse coordinates JSON string
    if (coordinates) {
      try {
        const coords =
          typeof coordinates === "string"
            ? JSON.parse(coordinates)
            : coordinates;
        propertyData.coordinates = { lat: coords.lat, lng: coords.lng };
      } catch (e) {
        // If parsing fails, skip coordinates
      }
    }

    // Parse amenities JSON string and set binary fields
    if (amenities) {
      try {
        const parsedAmenities =
          typeof amenities === "string" ? JSON.parse(amenities) : amenities;
        propertyData.amenities = parsedAmenities; // Keep the original array
        parsedAmenities.forEach((a) => {
          if (amenitiesMap[a]) propertyData[amenitiesMap[a]] = 1;
        });
      } catch (e) {
        // If parsing fails, skip amenities
      }
    }

    // Upload images to Cloudinary
    console.log(
      `📸 Processing ${req.files ? req.files.length : 0} files for upload`,
    );
    const imageUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const result = await uploadToCloudinary(
            file.buffer,
            "aqarico/properties",
          );
          imageUrls.push(result.secure_url);
        } catch (uploadError) {
          console.error("Image upload error:", uploadError.message);
        }
      }
    }
    propertyData.images = imageUrls;

    // Save property to MongoDB
    const property = await Property.create(propertyData);

    // If type is 'sale', call ML service for price prediction
    if (type === "sale") {
      try {
        const mlFields = {
          location: property.location,
          district: property.district || "",
          finish: property.finish || "",
          area: property.area,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          yearBuilt: property.yearBuilt || 2020,
          floor: property.floor || 0,
          furnished: property.furnished,
          electricityMeter: property.electricityMeter,
          naturalGas: property.naturalGas,
          waterMeter: property.waterMeter,
          elevator: property.elevator,
          security: property.security,
        };

        console.log(`[ML DEBUG] Requesting price prediction for property in ${property.location}...`);
        const response = await axios.post(
          `${process.env.ML_SERVICE_URL}/predict`,
          mlFields,
        );
        console.log(`[ML DEBUG] Prediction received: ${response.data.predictedPrice}`);
        property.predictedPrice = response.data.predictedPrice;
        await property.save();
      } catch (mlError) {
        // ML service is down or errored — don't crash, just set to null
        console.error("ML service error:", mlError.message);
        property.predictedPrice = null;
        await property.save();
      }
    }

    res.status(201).json({
      success: true,
      data: property,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a property
 * @route   PUT /api/properties/:id
 * @access  Owner or Admin
 */
export const updateProperty = async (req, res, next) => {
  try {
    let property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    // Check ownership (unless admin)
    if (
      property.owner.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this property",
      });
    }

    const updateData = { ...req.body };
    delete updateData.isVerified;
    delete updateData.isFairPrice;

    if (req.body.levelWarning !== undefined) {
      const level = Number(req.body.levelWarning);
      if (level >= 3) {
        updateData.isVerified = false;
        updateData.isFairPrice = false;
      } else {
        updateData.isVerified = true;
        updateData.isFairPrice = true;
      }
    }

    // Parse coordinates if provided
    if (updateData.coordinates && typeof updateData.coordinates === "string") {
      try {
        updateData.coordinates = JSON.parse(updateData.coordinates);
      } catch (e) {
        /* skip */
      }
    }

    // Parse amenities if provided
    if (updateData.amenities) {
      try {
        const parsedAmenities =
          typeof updateData.amenities === "string"
            ? JSON.parse(updateData.amenities)
            : updateData.amenities;
        // Reset all amenities to 0 first
        Object.values(amenitiesMap).forEach((field) => {
          updateData[field] = 0;
        });
        parsedAmenities.forEach((a) => {
          if (amenitiesMap[a]) updateData[amenitiesMap[a]] = 1;
        });
        updateData.amenities = parsedAmenities;
      } catch (e) {
        /* skip */
      }
    }

    // Handle image updates
    // existingImages is a JSON string containing URLs of images the user kept
    let baseImages = property.images || [];
    if (updateData.existingImages) {
      try {
        baseImages =
          typeof updateData.existingImages === "string"
            ? JSON.parse(updateData.existingImages)
            : updateData.existingImages;
      } catch (e) {
        console.error("Failed to parse existingImages:", e);
      }
    }

    // Handle new image uploads
    if (req.files && req.files.length > 0) {
      const newImageUrls = [];
      for (const file of req.files) {
        try {
          const result = await uploadToCloudinary(
            file.buffer,
            "aqarico/properties",
          );
          newImageUrls.push(result.secure_url);
        } catch (uploadError) {
          console.error("Image upload error:", uploadError.message);
        }
      }
      // Combine existing images (that were kept) with new uploads
      updateData.images = [...baseImages, ...newImageUrls];
    } else if (updateData.existingImages) {
      // If no new files, but existingImages was provided, it means user might have removed some
      updateData.images = baseImages;
    }

    // Convert numeric fields
    if (updateData.price) updateData.price = Number(updateData.price);
    if (updateData.area) updateData.area = Number(updateData.area);
    if (updateData.bedrooms) updateData.bedrooms = Number(updateData.bedrooms);
    if (updateData.bathrooms)
      updateData.bathrooms = Number(updateData.bathrooms);
    if (updateData.yearBuilt)
      updateData.yearBuilt = Number(updateData.yearBuilt);
    if (updateData.floor !== undefined)
      updateData.floor = Number(updateData.floor);

    property = await Property.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    res.json({
      success: true,
      data: property,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a property
 * @route   DELETE /api/properties/:id
 * @access  Owner or Admin
 */
export const deleteProperty = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    // Check ownership (unless admin)
    if (
      property.owner.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this property",
      });
    }

    await Property.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Property deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete multiple properties
 * @route   POST /api/properties/batch-delete
 * @access  Batch Owners or Admin
 */
export const batchDeleteProperties = async (req, res, next) => {
  try {
    const { ids } = req.body;
    console.log(`[BATCH DELETE PROPERTIES] User: ${req.user._id} (${req.user.role}), IDs count: ${ids?.length}`);

    if (!ids || !Array.isArray(ids) || ids.length === 0) {

      return res.status(400).json({
        success: false,
        message: "Please provide a non-empty array of property IDs",
      });
    }

    const query = { _id: { $in: ids } };

    // If not admin, restrict to properties owned by the user
    if (req.user.role !== "admin") {
      query.owner = req.user._id;
    }

    const result = await Property.deleteMany(query);

    res.json({
      success: true,
      message: `${result.deletedCount} properties deleted successfully`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    next(error);
  }
};


/**
 * @desc    Toggle property verification (admin only)
 * @route   PUT /api/properties/:id/verify
 * @access  Admin
 */
export const verifyProperty = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    property.isVerified = !property.isVerified;
    await property.save();

    res.json({
      success: true,
      data: property,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Toggle property featured status (admin only)
 * @route   PUT /api/properties/:id/feature
 * @access  Admin
 */
export const toggleFeatureProperty = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    property.isFeatured = !property.isFeatured;
    await property.save();

    res.json({
      success: true,
      data: property,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Compare multiple properties
 * @route   POST /api/properties/compare
 * @access  Public
 */
export const compareProperties = async (req, res, next) => {
  try {
    const { propertyIds } = req.body;

    if (
      !propertyIds ||
      !Array.isArray(propertyIds) ||
      propertyIds.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide an array of property IDs",
      });
    }

    const properties = await Property.find({
      _id: { $in: propertyIds },
    }).populate("owner", "firstName lastName email avatar");

    res.json({
      success: true,
      data: properties,
    });
  } catch (error) {
    next(error);
  }
};

const REAL_ESTATE_IMAGES = [
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1600607687940-47200269553d?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1600566753190-17f0bb2a6c3e?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1600585154526-990dcea4db0d?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1582408921715-18e7806367c1?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1574362848149-11496d93a7c7?auto=format&fit=crop&q=80&w=800",
];

const LOCATION_IMAGES = {
  Smouha:
    "https://img-3.aqarmap.com.eg/new-aqarmap-media/search-thumb/2012/5fd08bad72958383856225.jpg",
  Roshdy:
    "https://img-1.aqarmap.com.eg/new-aqarmap-media/search-thumb/2012/5fcf6beac1ff8106244961.jpg",
  "San Stefano":
    "https://img-2.aqarmap.com.eg/new-aqarmap-media/search-thumb/2012/5fd0818e1c850696344777.jpg",
  Miami:
    "https://img-0.aqarmap.com.eg/new-aqarmap-media/search-thumb/2012/5fd0a5419542a225732701.jpg",
  "Kafr Abdo":
    "https://img-4.aqarmap.com.eg/new-aqarmap-media/search-thumb/2008/5f27d952a2a29092561011.jpg",
  "Sidi Gaber":
    "https://img-3.aqarmap.com.eg/new-aqarmap-media/search-thumb/2012/5fd09a14e469f819956364.jpg",
  Lauran:
    "https://img-3.aqarmap.com.eg/new-aqarmap-media/search-thumb/2012/5fd0a1769047f057873505.jpg",
  Victoria:
    "https://img-2.aqarmap.com.eg/new-aqarmap-media/search-thumb/2012/5fd09dc29092c588111077.jpg",
  "Sidi Bishr":
    "https://img-4.aqarmap.com.eg/new-aqarmap-media/search-thumb/2012/5fd08da209ae5246429635.jpg",
  "Borg El Arab":
    "https://img-1.aqarmap.com.eg/new-aqarmap-media/search-thumb/2012/5fcf666ccb547402713003.jpeg",
  "Camp Cesar":
    "https://img-3.aqarmap.com.eg/new-aqarmap-media/search-thumb/2012/5fd09e8d0d6c5581952476.jpg",
  Glim: "https://img-1.aqarmap.com.eg/new-aqarmap-media/search-thumb/2012/5fcf6a9ea6d0c606464967.jpg",
  "El Mandara":
    "https://img-0.aqarmap.com.eg/new-aqarmap-media/search-thumb/2101/600d3afb3b634001763018.jpg",
  "El Asafra":
    "https://img-2.aqarmap.com.eg/new-aqarmap-media/search-thumb/2012/5fcf5dc0739aa322920808.jpg",
  "Moharram Bek":
    "https://img-3.aqarmap.com.eg/new-aqarmap-media/search-thumb/2012/5fcf297621cca104490050.jpeg",
  Ibrahimia:
    "https://img-0.aqarmap.com.eg/new-aqarmap-media/search-thumb/2012/5fcf417c5d36b405455939.jpg",
  Fleming:
    "https://img-4.aqarmap.com.eg/new-aqarmap-media/search-thumb/2012/5fd09affc5740915860212.jpg",
  Stanley:
    "https://img-4.aqarmap.com.eg/new-aqarmap-media/search-thumb/2012/5fd089c2ad462493683764.jpg",
  Bolekly:
    "https://img-4.aqarmap.com.eg/new-aqarmap-media/search-thumb/2012/5fcf691dc6e5d856515058.jpg",
  Zezenia:
    "https://img-2.aqarmap.com.eg/new-aqarmap-media/search-thumb/2012/5fd07f149fed6824182759.jpg",
  Bakoos:
    "https://img-2.aqarmap.com.eg/new-aqarmap-media/search-thumb/2101/600d3d7bae794072761788.jpg",
  Ganaklis:
    "https://img-0.aqarmap.com.eg/new-aqarmap-media/search-thumb/2012/5fd0a7d2a7f7d448945552.jpg",
  "El Mamoura":
    "https://img-2.aqarmap.com.eg/new-aqarmap-media/search-thumb/2101/600d37eada002264766873.jpg",
  Sporting:
    "https://img-2.aqarmap.com.eg/new-aqarmap-media/search-thumb/2012/5fd084bec66c1085949046.jpg",
  "Saba Basha":
    "https://img-4.aqarmap.com.eg/new-aqarmap-media/search-thumb/2012/5fd08065ebf3e055411256.jpg",
  "El Hadara":
    "https://img-0.aqarmap.com.eg/new-aqarmap-media/search-thumb/2012/5fcf580abcc3a678323444.jpg",
  "El Chatby":
    "https://img-0.aqarmap.com.eg/new-aqarmap-media/search-thumb/2012/5fcf5b59ed5e5944452504.jpg",
  "King Mariout":
    "https://img-1.aqarmap.com.eg/new-aqarmap-media/search-thumb/2012/5fd0a036e8277132762664.jpg",
  Cleopatra:
    "https://img-2.aqarmap.com.eg/new-aqarmap-media/search-thumb/2012/5fd09f450d99c379224748.jpg",
  Mansheya:
    "https://img-1.aqarmap.com.eg/new-aqarmap-media/search-thumb/2012/5fcf636788bee503073542.jpg",
  "El Montazah":
    "https://img-0.aqarmap.com.eg/new-aqarmap-media/search-thumb/2012/5fcf6049541e5723340436.jpg",
  "El Amreya":
    "https://img-3.aqarmap.com.eg/new-aqarmap-media/search-thumb/2012/5fd0a5fab98e3871434543.jpg",
  "Abu Talat":
    "https://img-2.aqarmap.com.eg/new-aqarmap-media/search-thumb/2012/5fcf3ecc283a1971012536.jpg",
  "New Miami":
    "https://img-2.aqarmap.com.eg/new-aqarmap-media/search-thumb/2008/5f27d79380bb6331309208.jpg",
  "Mahta El Raml":
    "https://img-0.aqarmap.com.eg/new-aqarmap-media/search-thumb/2012/5fd0a34a6096d912878787.jpg",
  "El Seyouf":
    "https://img-1.aqarmap.com.eg/new-aqarmap-media/search-thumb/2012/5fcf59bc6e45c510687627.jpg",
  "Abo Qir":
    "https://img-4.aqarmap.com.eg/new-aqarmap-media/search-thumb/2012/5fcf2e6fa0e41469557710.jpeg",
  "El Agami":
    "https://static.shared.propertyfinder.eg/media/images/listing/PZGG9D6RQ1VMH51R6Y069PH0A8/a3b3dd7d-35c8-47e0-bc7d-13c75ad349c8/668x452.jpg",
  Gharb:
    "https://static.shared.propertyfinder.eg/media/images/listing/A0BKDFCEDH6MT6SF4EWC2M7DFM/36cb6e84-d130-4eef-9663-5ac70b9493b3/416x272.jpg",
  Sharq:
    "https://upload.wikimedia.org/wikipedia/commons/6/6e/%D9%83%D9%88%D8%A8%D8%B1%D9%8A_%D8%B3%D8%AA%D8%A7%D9%86%D9%84%D9%8A_%D8%B4%D8%AA%D8%A7%D8%A1%D8%A7_-_%D8%A7%D9%84%D8%A7%D8%B3%D9%83%D9%86%D8%AF%D8%B1%D9%8A%D8%A9.jpg",
  "Moharram Bek":
    "https://img-3.aqarmap.com.eg/new-aqarmap-media/search-thumb/2012/5fcf297621cca104490050.jpeg",
  Bahary:
    "https://mediaaws-live.almasryalyoum.com/almasryalyoum/uploads/images/2026/03/03/thumbs/600x600/1656602.jpg",
  "Ras Al Tin":
    "https://upload.wikimedia.org/wikipedia/commons/7/7d/Bundesarchiv_Bild_102-12200%2C_Alexandria%2C_Ras-El-Tine-Palast.jpg",
  "El Max":
    "https://static.srpcdigital.com/styles/1037xauto/public/2014/12/24/Daily-251214-4.jpg.webp",
  "Mina El Basal":
    "https://upfi-med.eib.org/wp-content/uploads/2016/09/alexandrie2.jpg",
  "El Dekhila":
    "https://static.srpcdigital.com/styles/1037xauto/public/2024-08/757168.jpeg.webp",
  "El Saa'ah Sq": "https://pbs.twimg.com/media/FCqA0-eXsAU1CRk.jpg",
  Victorya:
    "https://img-2.aqarmap.com.eg/new-aqarmap-media/search-thumb/2012/5fd09dc29092c588111077.jpg",
  "Wasat District":
    "https://upload.wikimedia.org/wikipedia/commons/c/c5/Qaed_Ibrahim_Mosque%2C_Alexandria%2C_Egypt_-_4416696582.jpg",
  "Kilo 21":
    "https://upload.wikimedia.org/wikipedia/commons/b/b7/Kilo_21%2C_Alexandria.jpg",
  "Abu Youssef":
    "https://media.gemini.media/img/large/2017/7/21/2017_7_21_21_18_19_278.jpg",
  "El Hanouvel":
    "https://www.urtrips.com/wp-content/uploads/2022/05/hannoville-public-beach1.jpg",
  "El Awayed":
    "https://img-3.aqarmap.com.eg/new-aqarmap-media/search-thumb-webp/2604/69d9a712b125e925613535.jpg",
  "El Bitash":
    "https://upload.wikimedia.org/wikipedia/commons/9/9b/Minaret%2C_ElAgmay_000_%287%29.JPG",
  "El Wardiyan":
    "https://alexnews.wordpress.com/wp-content/uploads/2022/02/28-2-2.jpg",
  "El Qabari":
    "https://mediaaws-live.almasryalyoum.com/AMAYLivePictures/portalimages/news/original/2010/07/08/228/hzm_jwd_11.jpg",
  "El Gomrok District":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Sea_Of_Alex.JPG/330px-Sea_Of_Alex.JPG",
};

const getLocImage = (name, fallbackIdx) => {
  if (LOCATION_IMAGES[name]) return LOCATION_IMAGES[name];
  // Check common variations
  const variations = {
    "El Mamoura": "El Mamoura",
    Mamoura: "El Mamoura",
    "Al Mamoura": "El Mamoura",
    "Sidi Bishr": "Sidi Bishr",
    "Sydy Bshr": "Sidi Bishr",
    Miami: "Miami",
    Victorea: "Victoria",
    Victoria: "Victoria",
    Agami: "El Agami",
    "El Agami": "El Agami",
    "Al Agami": "El Agami",
    Gharb: "Gharb",
    West: "Gharb",
    Sharq: "Sharq",
    East: "Sharq",
    "Moharram Bey": "Moharram Bek",
    "Moharram Bek": "Moharram Bek",
    Bahary: "Bahary",
    Bahari: "Bahary",
    "Ras El Tin": "Ras El Tin",
    "Ras El Teen": "Ras El Tin",
    "Ras Al Tin": "Ras El Tin",
    "El Max": "El Max",
    "Mina El Basal": "Mina El Basal",
    "El Dekhila": "El Dekhila",
    Dekhila: "El Dekhila",
    "El Saa'ah": "El Saa'ah Sq",
    "El Saa'ah Sq": "El Saa'ah Sq",
    Victorya: "Victorya",
    Wasat: "Wasat District",
    "Wasat District": "Wasat District",
    "Kilo 21": "Kilo 21",
    "Abu Youssef": "Abu Youssef",
    "El Hanouvel": "El Hanouvel",
    Hanouvel: "El Hanouvel",
    "El Awayed": "El Awayed",
    Awayed: "El Awayed",
    "El Bitash": "El Bitash",
    Bitash: "El Bitash",
    "El Wardiyan": "El Wardiyan",
    Wardiyan: "El Wardiyan",
    "El Qabari": "El Qabari",
    Qabari: "El Qabari",
    "El Gomrok": "El Gomrok District",
    Gomrok: "El Gomrok District",
    "Gomrok District": "El Gomrok District",
    "El Gomrok District": "El Gomrok District",
  };
  if (variations[name] && LOCATION_IMAGES[variations[name]])
    return LOCATION_IMAGES[variations[name]];
  return REAL_ESTATE_IMAGES[fallbackIdx % REAL_ESTATE_IMAGES.length];
};

/**
 * @desc    Get aggregated market stats
 * @route   GET /api/properties/stats/market
 * @access  Public
 */
export const getMarketStats = async (req, res, next) => {
  try {
    const { type = "sale" } = req.query;

    // 1. Overall Metrics
    const allStats = await Property.aggregate([
      { $match: { type } },
      {
        $group: {
          _id: null,
          total_listings: { $sum: 1 },
          overall_avg_price: { $avg: "$price" },
          overall_total_area: { $sum: "$area" },
          overall_total_price: { $sum: "$price" },
        },
      },
    ]);

    const overall = allStats[0] || {
      total_listings: 0,
      overall_avg_price: 0,
      overall_total_area: 0,
      overall_total_price: 0,
    };
    const overall_avg_ppm2 =
      overall.overall_total_area > 0
        ? overall.overall_total_price / overall.overall_total_area
        : 0;

    // 2. District & Location Breakdown
    const districtStats = await Property.aggregate([
      { $match: { type } },
      {
        $group: {
          _id: { district: "$district", location: "$location" },
          avg_price: { $avg: "$price" },
          avg_area: { $avg: "$area" },
          total_price: { $sum: "$price" },
          total_area: { $sum: "$area" },
          count: { $sum: 1 },
          avg_year_built: { $avg: { $ifNull: ["$yearBuilt", 2015] } },
        },
      },
      {
        $group: {
          _id: "$_id.district",
          avg_price: { $avg: "$avg_price" },
          total_price: { $sum: "$total_price" },
          total_area: { $sum: "$total_area" },
          count: { $sum: "$count" },
          avg_area: { $avg: "$avg_area" },
          avg_year_built: { $avg: "$avg_year_built" },
          locations: {
            $push: {
              name: "$_id.location",
              avg_price: "$avg_price",
              avg_price_per_m2: {
                $cond: [
                  { $gt: ["$total_area", 0] },
                  { $divide: ["$total_price", "$total_area"] },
                  0,
                ],
              },
              count: "$count",
              avg_area: "$avg_area",
              avg_year_built: { $round: ["$avg_year_built", 0] },
            },
          },
        },
      },
    ]);

    // 3. Format District Stats with logic (Scores, Badges)
    const formattedDistricts = districtStats.map((d, i) => {
      const avg_price_per_m2 =
        d.total_area > 0 ? d.total_price / d.total_area : 0;

      // Calculate a simple score based on price/m2 relative to overall
      let score = Math.min(
        100,
        Math.round((avg_price_per_m2 / (overall_avg_ppm2 || 1)) * 50),
      );
      if (avg_price_per_m2 > overall_avg_ppm2 * 1.5)
        score = Math.min(100, 70 + Math.random() * 30);

      const districtImage = getLocImage(d._id, i);

      return {
        name: d._id || "Other",
        avg_price: Math.round(d.avg_price),
        median_price: Math.round(d.avg_price * 0.95), // Simulated median
        avg_price_per_m2: Math.round(avg_price_per_m2),
        count: d.count,
        avg_area: Math.round(d.avg_area * 10) / 10,
        avg_year_built: Math.round(d.avg_year_built),
        score: Math.round(score),
        image: districtImage,
        locations: d.locations.map((l, j) => ({
          ...l,
          avg_price: Math.round(l.avg_price),
          median_price: Math.round(l.avg_price * 0.95),
          avg_price_per_m2: Math.round(l.avg_price_per_m2),
          score: Math.round(
            Math.min(100, (l.avg_price_per_m2 / (avg_price_per_m2 || 1)) * 100),
          ),
          image: getLocImage(l.name, i + j + 1),
        })),
      };
    });

    // 4. Market Trend (Group by yearBuilt)
    const trendStats = await Property.aggregate([
      { $match: { type, yearBuilt: { $gte: 2000, $lte: 2026 } } },
      {
        $group: {
          _id: "$yearBuilt",
          avg_price: { $avg: "$price" },
          total_price: { $sum: "$price" },
          total_area: { $sum: "$area" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const market_trend = trendStats.map((t) => ({
      year: t._id,
      avg_price: Math.round(t.avg_price),
      avg_ppm2: t.total_area > 0 ? Math.round(t.total_price / t.total_area) : 0,
      count: t.count,
    }));

    res.json({
      success: true,
      data: {
        total_listings: overall.total_listings,
        overall_avg_price: Math.round(overall.overall_avg_price),
        overall_avg_ppm2: Math.round(overall_avg_ppm2),
        districts: formattedDistricts,
        market_trend:
          market_trend.length > 0
            ? market_trend
            : [
              {
                year: new Date().getFullYear(),
                avg_price: overall.overall_avg_price,
                avg_ppm2: overall_avg_ppm2,
                count: overall.total_listings,
              },
            ],
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get detailed stats for a specific location (neighborhood)
 * @route   GET /api/properties/stats/location/:name
 * @access  Public
 */
export const getLocationStats = async (req, res, next) => {
  try {
    const { name } = req.params;

    // 1. Overall for this location
    const stats = await Property.aggregate([
      { $match: { location: name } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          avg_price: { $avg: "$price" },
          total_price: { $sum: "$price" },
          total_area: { $sum: "$area" },
          avg_area: { $avg: "$area" },
          avg_year_built: { $avg: { $ifNull: ["$yearBuilt", 2015] } },
          // Amenities coverage
          elevator_count: { $sum: "$elevator" },
          security_count: { $sum: "$security" },
          gas_count: { $sum: "$naturalGas" },
          furnished_count: { $sum: "$furnished" },
        },
      },
    ]);

    if (stats.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Location not found" });
    }

    const loc = stats[0];
    const avg_ppm2 = loc.total_area > 0 ? loc.total_price / loc.total_area : 0;

    // 2. Trend (2000-2026)
    const trendStats = await Property.aggregate([
      { $match: { location: name, yearBuilt: { $gte: 2000, $lte: 2026 } } },
      {
        $group: {
          _id: "$yearBuilt",
          avg_ppm2: {
            $avg: {
              $cond: [
                { $gt: ["$area", 0] },
                { $divide: ["$price", "$area"] },
                0,
              ],
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // 3. Category breakdown
    const categories = await Property.aggregate([
      { $match: { location: name } },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          avg_price: { $avg: "$price" },
        },
      },
    ]);

    // 4. District comparison
    const sample = await Property.findOne({ location: name }, { district: 1 });
    const districtName = sample ? sample.district : null;
    let districtAvg = 0;
    if (districtName) {
      const dStats = await Property.aggregate([
        { $match: { district: districtName } },
        {
          $group: {
            _id: null,
            total_price: { $sum: "$price" },
            total_area: { $sum: "$area" },
          },
        },
      ]);
      if (dStats.length > 0)
        districtAvg =
          dStats[0].total_area > 0
            ? dStats[0].total_price / dStats[0].total_area
            : 0;
    }

    res.json({
      success: true,
      data: {
        name,
        district: districtName,
        image: getLocImage(name, 0),
        metrics: {
          avg_price: Math.round(loc.avg_price),
          avg_ppm2: Math.round(avg_ppm2),
          total_listings: loc.count,
          avg_area: Math.round(loc.avg_area),
          avg_year_built: Math.round(loc.avg_year_built),
          district_avg_ppm2: Math.round(districtAvg),
        },
        amenities: {
          elevator: Math.round((loc.elevator_count / loc.count) * 100),
          security: Math.round((loc.security_count / loc.count) * 100),
          gas: Math.round((loc.gas_count / loc.count) * 100),
          furnished: Math.round((loc.furnished_count / loc.count) * 100),
        },
        trend: trendStats.map((t) => ({
          year: t._id,
          avg_ppm2: Math.round(t.avg_ppm2),
        })),
        categories: categories.map((c) => ({
          name: c._id || "Other",
          count: c.count,
          avg_price: Math.round(c.avg_price),
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};
