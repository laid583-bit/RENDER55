import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.conversions import ConversionsService
from dependencies.auth import get_current_user
from schemas.auth import UserResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/conversions", tags=["conversions"])


# ---------- Pydantic Schemas ----------
class ConversionsData(BaseModel):
    """Entity data schema (for create/update)"""
    pair_id: int
    from_currency: str
    to_currency: str
    from_amount: float
    to_amount: float
    exchange_rate: float
    fee_amount: float = None
    fee_percentage: float = None
    fee_currency: str = None
    status: str = None


class ConversionsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    pair_id: Optional[int] = None
    from_currency: Optional[str] = None
    to_currency: Optional[str] = None
    from_amount: Optional[float] = None
    to_amount: Optional[float] = None
    exchange_rate: Optional[float] = None
    fee_amount: Optional[float] = None
    fee_percentage: Optional[float] = None
    fee_currency: Optional[str] = None
    status: Optional[str] = None


class ConversionsResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    pair_id: int
    from_currency: str
    to_currency: str
    from_amount: float
    to_amount: float
    exchange_rate: float
    fee_amount: Optional[float] = None
    fee_percentage: Optional[float] = None
    fee_currency: Optional[str] = None
    status: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ConversionsListResponse(BaseModel):
    """List response schema"""
    items: List[ConversionsResponse]
    total: int
    skip: int
    limit: int


class ConversionsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[ConversionsData]


class ConversionsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: ConversionsUpdateData


class ConversionsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[ConversionsBatchUpdateItem]


class ConversionsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=ConversionsListResponse)
async def query_conversionss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Query conversionss with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying conversionss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = ConversionsService(db)
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
            user_id=str(current_user.id),
        )
        logger.debug(f"Found {result['total']} conversionss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying conversionss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=ConversionsListResponse)
async def query_conversionss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query conversionss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying conversionss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = ConversionsService(db)
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
        logger.debug(f"Found {result['total']} conversionss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying conversionss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=ConversionsResponse)
async def get_conversions(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single conversions by ID (user can only see their own records)"""
    logger.debug(f"Fetching conversions with id: {id}, fields={fields}")
    
    service = ConversionsService(db)
    try:
        result = await service.get_by_id(id, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Conversions with id {id} not found")
            raise HTTPException(status_code=404, detail="Conversions not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching conversions {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=ConversionsResponse, status_code=201)
async def create_conversions(
    data: ConversionsData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new conversions"""
    logger.debug(f"Creating new conversions with data: {data}")
    
    service = ConversionsService(db)
    try:
        result = await service.create(data.model_dump(), user_id=str(current_user.id))
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create conversions")
        
        logger.info(f"Conversions created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating conversions: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating conversions: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[ConversionsResponse], status_code=201)
async def create_conversionss_batch(
    request: ConversionsBatchCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple conversionss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} conversionss")
    
    service = ConversionsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} conversionss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[ConversionsResponse])
async def update_conversionss_batch(
    request: ConversionsBatchUpdateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple conversionss in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} conversionss")
    
    service = ConversionsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict, user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} conversionss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=ConversionsResponse)
async def update_conversions(
    id: int,
    data: ConversionsUpdateData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing conversions (requires ownership)"""
    logger.debug(f"Updating conversions {id} with data: {data}")

    service = ConversionsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Conversions with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Conversions not found")
        
        logger.info(f"Conversions {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating conversions {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating conversions {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_conversionss_batch(
    request: ConversionsBatchDeleteRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple conversionss by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} conversionss")
    
    service = ConversionsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=str(current_user.id))
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} conversionss successfully")
        return {"message": f"Successfully deleted {deleted_count} conversionss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_conversions(
    id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single conversions by ID (requires ownership)"""
    logger.debug(f"Deleting conversions with id: {id}")
    
    service = ConversionsService(db)
    try:
        success = await service.delete(id, user_id=str(current_user.id))
        if not success:
            logger.warning(f"Conversions with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Conversions not found")
        
        logger.info(f"Conversions {id} deleted successfully")
        return {"message": "Conversions deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting conversions {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")