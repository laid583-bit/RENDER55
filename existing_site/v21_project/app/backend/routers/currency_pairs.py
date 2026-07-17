import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.currency_pairs import Currency_pairsService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/currency_pairs", tags=["currency_pairs"])


# ---------- Pydantic Schemas ----------
class Currency_pairsData(BaseModel):
    """Entity data schema (for create/update)"""
    base_currency: str
    quote_currency: str
    pair_name: str
    is_active: bool = None
    created_at: Optional[datetime] = None


class Currency_pairsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    base_currency: Optional[str] = None
    quote_currency: Optional[str] = None
    pair_name: Optional[str] = None
    is_active: Optional[bool] = None
    created_at: Optional[datetime] = None


class Currency_pairsResponse(BaseModel):
    """Entity response schema"""
    id: int
    base_currency: str
    quote_currency: str
    pair_name: str
    is_active: Optional[bool] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Currency_pairsListResponse(BaseModel):
    """List response schema"""
    items: List[Currency_pairsResponse]
    total: int
    skip: int
    limit: int


class Currency_pairsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Currency_pairsData]


class Currency_pairsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Currency_pairsUpdateData


class Currency_pairsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Currency_pairsBatchUpdateItem]


class Currency_pairsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Currency_pairsListResponse)
async def query_currency_pairss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query currency_pairss with filtering, sorting, and pagination"""
    logger.debug(f"Querying currency_pairss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Currency_pairsService(db)
    try:
        # Parse query JSON if provided
        query_dict = None
        if query:
            try:
                query_dict = json.loads(query)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid query JSON format")
        
        result = await service.get_list(
            skip=skip, 
            limit=limit,
            query_dict=query_dict,
            sort=sort,
        )
        logger.debug(f"Found {result['total']} currency_pairss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying currency_pairss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Currency_pairsListResponse)
async def query_currency_pairss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query currency_pairss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying currency_pairss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Currency_pairsService(db)
    try:
        # Parse query JSON if provided
        query_dict = None
        if query:
            try:
                query_dict = json.loads(query)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid query JSON format")

        result = await service.get_list(
            skip=skip,
            limit=limit,
            query_dict=query_dict,
            sort=sort
        )
        logger.debug(f"Found {result['total']} currency_pairss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying currency_pairss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Currency_pairsResponse)
async def get_currency_pairs(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single currency_pairs by ID"""
    logger.debug(f"Fetching currency_pairs with id: {id}, fields={fields}")
    
    service = Currency_pairsService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Currency_pairs with id {id} not found")
            raise HTTPException(status_code=404, detail="Currency_pairs not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching currency_pairs {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Currency_pairsResponse, status_code=201)
async def create_currency_pairs(
    data: Currency_pairsData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new currency_pairs"""
    logger.debug(f"Creating new currency_pairs with data: {data}")
    
    service = Currency_pairsService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create currency_pairs")
        
        logger.info(f"Currency_pairs created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating currency_pairs: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating currency_pairs: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Currency_pairsResponse], status_code=201)
async def create_currency_pairss_batch(
    request: Currency_pairsBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple currency_pairss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} currency_pairss")
    
    service = Currency_pairsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} currency_pairss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Currency_pairsResponse])
async def update_currency_pairss_batch(
    request: Currency_pairsBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple currency_pairss in a single request"""
    logger.debug(f"Batch updating {len(request.items)} currency_pairss")
    
    service = Currency_pairsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} currency_pairss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Currency_pairsResponse)
async def update_currency_pairs(
    id: int,
    data: Currency_pairsUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing currency_pairs"""
    logger.debug(f"Updating currency_pairs {id} with data: {data}")

    service = Currency_pairsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Currency_pairs with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Currency_pairs not found")
        
        logger.info(f"Currency_pairs {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating currency_pairs {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating currency_pairs {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_currency_pairss_batch(
    request: Currency_pairsBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple currency_pairss by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} currency_pairss")
    
    service = Currency_pairsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} currency_pairss successfully")
        return {"message": f"Successfully deleted {deleted_count} currency_pairss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_currency_pairs(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single currency_pairs by ID"""
    logger.debug(f"Deleting currency_pairs with id: {id}")
    
    service = Currency_pairsService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Currency_pairs with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Currency_pairs not found")
        
        logger.info(f"Currency_pairs {id} deleted successfully")
        return {"message": "Currency_pairs deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting currency_pairs {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")