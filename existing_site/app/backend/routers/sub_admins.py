import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.sub_admins import Sub_adminsService
from dependencies.auth import get_current_user
from schemas.auth import UserResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/sub_admins", tags=["sub_admins"])


# ---------- Pydantic Schemas ----------
class Sub_adminsData(BaseModel):
    """Entity data schema (for create/update)"""
    email: str
    name: str
    permissions: str
    is_active: bool
    notes: str = None


class Sub_adminsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    email: Optional[str] = None
    name: Optional[str] = None
    permissions: Optional[str] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None


class Sub_adminsResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    email: str
    name: str
    permissions: str
    is_active: bool
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Sub_adminsListResponse(BaseModel):
    """List response schema"""
    items: List[Sub_adminsResponse]
    total: int
    skip: int
    limit: int


class Sub_adminsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Sub_adminsData]


class Sub_adminsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Sub_adminsUpdateData


class Sub_adminsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Sub_adminsBatchUpdateItem]


class Sub_adminsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Sub_adminsListResponse)
async def query_sub_adminss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Query sub_adminss with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying sub_adminss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Sub_adminsService(db)
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
        logger.debug(f"Found {result['total']} sub_adminss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying sub_adminss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Sub_adminsListResponse)
async def query_sub_adminss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query sub_adminss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying sub_adminss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Sub_adminsService(db)
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
        logger.debug(f"Found {result['total']} sub_adminss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying sub_adminss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Sub_adminsResponse)
async def get_sub_admins(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single sub_admins by ID (user can only see their own records)"""
    logger.debug(f"Fetching sub_admins with id: {id}, fields={fields}")
    
    service = Sub_adminsService(db)
    try:
        result = await service.get_by_id(id, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Sub_admins with id {id} not found")
            raise HTTPException(status_code=404, detail="Sub_admins not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching sub_admins {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Sub_adminsResponse, status_code=201)
async def create_sub_admins(
    data: Sub_adminsData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new sub_admins"""
    logger.debug(f"Creating new sub_admins with data: {data}")
    
    service = Sub_adminsService(db)
    try:
        result = await service.create(data.model_dump(), user_id=str(current_user.id))
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create sub_admins")
        
        logger.info(f"Sub_admins created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating sub_admins: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating sub_admins: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Sub_adminsResponse], status_code=201)
async def create_sub_adminss_batch(
    request: Sub_adminsBatchCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple sub_adminss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} sub_adminss")
    
    service = Sub_adminsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} sub_adminss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Sub_adminsResponse])
async def update_sub_adminss_batch(
    request: Sub_adminsBatchUpdateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple sub_adminss in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} sub_adminss")
    
    service = Sub_adminsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict, user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} sub_adminss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Sub_adminsResponse)
async def update_sub_admins(
    id: int,
    data: Sub_adminsUpdateData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing sub_admins (requires ownership)"""
    logger.debug(f"Updating sub_admins {id} with data: {data}")

    service = Sub_adminsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Sub_admins with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Sub_admins not found")
        
        logger.info(f"Sub_admins {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating sub_admins {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating sub_admins {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_sub_adminss_batch(
    request: Sub_adminsBatchDeleteRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple sub_adminss by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} sub_adminss")
    
    service = Sub_adminsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=str(current_user.id))
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} sub_adminss successfully")
        return {"message": f"Successfully deleted {deleted_count} sub_adminss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_sub_admins(
    id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single sub_admins by ID (requires ownership)"""
    logger.debug(f"Deleting sub_admins with id: {id}")
    
    service = Sub_adminsService(db)
    try:
        success = await service.delete(id, user_id=str(current_user.id))
        if not success:
            logger.warning(f"Sub_admins with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Sub_admins not found")
        
        logger.info(f"Sub_admins {id} deleted successfully")
        return {"message": "Sub_admins deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting sub_admins {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")